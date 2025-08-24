import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import { DomainInfo, DomainClientEPPStatus, DomainAuthCode } from "./types";
import ManageDNSRecords from "./manage-dns-records";
import { API_HEADERS, API_URL, parseResponse, useSpaceship } from "./spaceship";

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
    const accessories: List.Item.Accessory[] = [
      { tag: domain.privacyProtection.level === "high" ? "Private" : "Public", tooltip: "Privacy" },
    ];
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
          accessories={isShowingDetail ? undefined : generateAccessories(domain)}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.AppWindowSidebarLeft}
                title="Toggle Details"
                onAction={() => setIsShowingDetail((show) => !show)}
              />
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.Push icon={Icon.Store} title="Manage DNS Records" target={<ManageDNSRecords domain={domain} />} />
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
