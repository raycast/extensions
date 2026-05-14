import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { getFavicon, useCachedState, useForm } from "@raycast/utils";
import { DomainInfo, DomainClientEPPStatus, DomainAuthCode } from "./types";
import ManageDNSRecords from "./manage-dns-records";
import { API_HEADERS, API_URL, parseResponse, useSpaceship } from "./spaceship";
import dayjs from "dayjs";
import { useState } from "react";

export default function ManageDomains() {
  const { push } = useNavigation();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-details-domains", false);
  const { isLoading, data: domains, mutate } = useSpaceship<DomainInfo>("domains");

  function formatDate(date: string) {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
    const formattedDate = new Date(date).toLocaleDateString("en-US", options);
    return formattedDate;
  }

  function isLocked(domain: DomainInfo) {
    return domain.eppStatuses.includes(DomainClientEPPStatus.clientTransferProhibited);
  }

  function generateAccessories(domain: DomainInfo) {
    const accessories: List.Item.Accessory[] = [];

    const expiration = dayjs(domain.expirationDate);
    const today = dayjs();
    switch (domain.lifecycleStatus) {
      case "grace1": {
        const days = expiration.add(7, "day").diff(today, "day");
        const tooltip = `❗ Expired domain will go offline in ${days <= 1 ? "a day" : `${days} days`}.`;
        accessories.push(
          !isShowingDetail
            ? { tag: { value: "GRACE", color: Color.Red }, tooltip }
            : { icon: { source: Icon.Warning, tintColor: Color.Red }, tooltip },
        );
        break;
      }
      case "grace2": {
        const days = expiration.add(30, "day").diff(today, "day");
        const tooltip = `❗ Expired domain will be removed in ${days} days.`;
        accessories.push(
          !isShowingDetail
            ? { tag: { value: "GRACE", color: Color.Red }, tooltip }
            : { icon: { source: Icon.Warning, tintColor: Color.Red }, tooltip },
        );
        break;
      }
      case "redemption": {
        const tooltip = `❗ Expired domain will be removed soon.`;
        accessories.push(
          !isShowingDetail
            ? { tag: { value: "REDEMPTION", color: Color.Red }, tooltip }
            : { icon: { source: Icon.Warning, tintColor: Color.Red }, tooltip },
        );
        break;
      }
      case "registered": {
        const differenceInDays = expiration.diff(today, "day");
        const is30DaysOrLess = differenceInDays <= 30;
        const tooltip = `⚠️ Expires in ${differenceInDays} days.`;
        if (is30DaysOrLess)
          accessories.push(
            !isShowingDetail
              ? { tag: { value: "EXPIRING", color: Color.Yellow }, tooltip }
              : { icon: { source: Icon.Warning, tintColor: Color.Yellow }, tooltip },
          );
        break;
      }
    }
    if (isShowingDetail) return accessories;

    accessories.push({ tag: domain.privacyProtection.level === "high" ? "Private" : "Public", tooltip: "Privacy" });
    accessories.push({
      tag: isLocked(domain) ? { value: "LOCKED", color: Color.Green } : { value: "UNLOCKED", color: Color.Red },
      tooltip: "Transfer lock",
    });
    accessories.push({
      date: new Date(domain.expirationDate),
      tooltip: `Expires on ${formatDate(domain.expirationDate)}`,
    });
    return accessories;
  }

  async function getDomainAuthCode(domain: DomainInfo) {
    const toast = await showToast(Toast.Style.Animated, "Fetching Auth Code", domain.name);
    try {
      const response = await fetch(`${API_URL}domains/${domain.name}/transfer/auth-code`, {
        headers: API_HEADERS,
      });
      const result = (await parseResponse(response)) as DomainAuthCode;
      toast.style = Toast.Style.Success;
      toast.title = "Fetched Auth Code";
      push(
        <Detail
          markdown={`# ${domain.name} \n---\n Auth Code: ${result.authCode} \n\n Expires: ${result.expires || "N/A"}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Auth Code to Clipboard" content={result.authCode} />
            </ActionPanel>
          }
        />,
      );
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = `${error}`;
    }
  }

  async function updateDomainTransferLock(domain: DomainInfo, action: "Lock" | "Unlock") {
    const toast = await showToast(Toast.Style.Animated, `${action}ing`, domain.name);
    try {
      await mutate(
        fetch(`${API_URL}domains/${domain.name}/transfer/lock`, {
          method: "PUT",
          headers: API_HEADERS,
          body: JSON.stringify({
            isLocked: action === "Lock",
          }),
        }).then(parseResponse),
        {
          optimisticUpdate(data) {
            const eppStatuses =
              action === "Lock"
                ? [...domain.eppStatuses, DomainClientEPPStatus.clientTransferProhibited]
                : domain.eppStatuses.filter((status) => status !== DomainClientEPPStatus.clientTransferProhibited);
            return data.map((d) => (d.name === domain.name ? { ...d, eppStatuses } : d));
          },
          shouldRevalidateAfter: false,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = `${action}ed`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {domains.map((domain) => (
        <List.Item
          key={domain.name}
          icon={getFavicon(`https://${domain.name}`, { fallback: Icon.Globe })}
          title={domain.name}
          accessories={generateAccessories(domain)}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.AppWindowSidebarLeft}
                title="Toggle Details"
                onAction={() => setIsShowingDetail((show) => !show)}
              />
              {["grace1", "registered"].includes(domain.lifecycleStatus) && (
                <>
                  <Action.Push
                    icon={Icon.Store}
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title="Manage DNS Records"
                    target={<ManageDNSRecords domain={domain} />}
                  />
                  <Action.Push
                    icon={Icon.Pencil}
                    title="Change Nameservers"
                    target={<ChangeNameservers domain={domain} />}
                    onPop={mutate}
                  />
                </>
              )}
              <Action.OpenInBrowser
                icon={getFavicon(`https://${domain.name}`, { fallback: Icon.Globe })}
                title={`Go to ${domain.name}`}
                url={`https://${domain.name}`}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
              <ActionPanel.Section>
                <Action icon={Icon.Shield} title="Get Auth Code" onAction={() => getDomainAuthCode(domain)} />
                {isLocked(domain) ? (
                  <Action
                    icon={{ source: Icon.LockUnlocked, tintColor: Color.Red }}
                    title="Unlock Domain"
                    onAction={() => updateDomainTransferLock(domain, "Unlock")}
                  />
                ) : (
                  <Action
                    icon={{ source: Icon.Lock, tintColor: Color.Green }}
                    title="Lock Domain"
                    onAction={() => updateDomainTransferLock(domain, "Lock")}
                  />
                )}
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={`${domain.nameservers.provider} Nameservers \n\n ${domain.nameservers.hosts.join("\n\n")}`}
            />
          }
        />
      ))}
    </List>
  );
}

function ChangeNameservers({ domain }: { domain: DomainInfo }) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, values } = useForm<{
    provider: string;
    host1: string;
    host2: string;
    host3: string;
    host4: string;
    host5: string;
    host6: string;
    host7: string;
    host8: string;
    host9: string;
    host10: string;
    host11: string;
    host12: string;
  }>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast(Toast.Style.Animated, "Changing");
      const { provider, ...rest } = values;
      const hosts = Object.values(rest).filter((host) => !!host);
      const body = provider === "basic" ? { provider } : { provider, hosts };
      try {
        await fetch(`${API_URL}domains/${domain.name}/nameservers`, {
          method: "PUT",
          headers: API_HEADERS,
          body: JSON.stringify(body),
        }).then(parseResponse);
        toast.style = Toast.Style.Success;
        toast.title = "Changed";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      provider: domain.nameservers.provider,
      host1: domain.nameservers.hosts[0],
      host2: domain.nameservers.hosts[1],
      host3: domain.nameservers.hosts[2],
      host4: domain.nameservers.hosts[3],
      host5: domain.nameservers.hosts[4],
      host6: domain.nameservers.hosts[5],
      host7: domain.nameservers.hosts[6],
      host8: domain.nameservers.hosts[7],
      host9: domain.nameservers.hosts[8],
      host10: domain.nameservers.hosts[9],
      host11: domain.nameservers.hosts[10],
      host12: domain.nameservers.hosts[11],
    },
    validation: {
      host1(value) {
        if (values.provider === "custom" && !value) return "The item is required";
      },
      host2(value) {
        if (values.provider === "custom" && !value) return "The item is required";
      },
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Select either Spaceship or custom DNS for your nameserver location." />
      <Form.Dropdown title="Provider" {...itemProps.provider}>
        <Form.Dropdown.Item title="Spaceship nameservers" value="basic" />
        <Form.Dropdown.Item title="Custom nameservers" value="custom" />
      </Form.Dropdown>
      <Form.Description
        text={
          values.provider === "basic"
            ? "Using Spaceship nameservers ensures that any connected products are automatically updated and can be customized with advanced DNS settings."
            : "Using custom nameservers means you manage your DNS setup at your external provider."
        }
      />
      <Form.Separator />
      {values.provider === "basic" ? (
        <Form.Description title="Nameservers" text={`launch1.spaceship.net\nlaunch2.spaceship.net`} />
      ) : (
        <>
          <Form.TextField title="" placeholder="ns1.example.com" {...itemProps.host1} />
          <Form.TextField title="" placeholder="ns2.example.com" {...itemProps.host2} />
          <Form.TextField title="" placeholder="ns3.example.com" {...itemProps.host3} />
          <Form.TextField title="" placeholder="ns4.example.com" {...itemProps.host4} />
          <Form.TextField title="" placeholder="ns5.example.com" {...itemProps.host5} />
          <Form.TextField title="" placeholder="ns6.example.com" {...itemProps.host6} />
          <Form.TextField title="" placeholder="ns7.example.com" {...itemProps.host7} />
          <Form.TextField title="" placeholder="ns8.example.com" {...itemProps.host8} />
          <Form.TextField title="" placeholder="ns9.example.com" {...itemProps.host9} />
          <Form.TextField title="" placeholder="ns10.example.com" {...itemProps.host10} />
          <Form.TextField title="" placeholder="ns11.example.com" {...itemProps.host11} />
          <Form.TextField title="" placeholder="ns12.example.com" {...itemProps.host12} />
        </>
      )}
    </Form>
  );
}
