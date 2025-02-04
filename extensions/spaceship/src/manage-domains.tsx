import { Action, ActionPanel, Color, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { getFavicon, useCachedState, useFetch } from "@raycast/utils";
import { DomainInfo, ErrorResult, SuccessResult, ResourceRecord, DomainClientEPPStatus } from "./types";

function useSpaceship<T>(endpoint: string) {
  const { apiKey, apiSecret } = getPreferenceValues<Preferences>();
  const { isLoading, data } = useFetch(`https://spaceship.dev/api/v1/${endpoint}?take=20&skip=0`, {
    headers: {
      "X-Api-Key": apiKey,
      "X-Api-Secret": apiSecret,
    },
    async parseResponse(response) {
      if (!response.ok) {
        const res: ErrorResult = await response.json();
        throw new Error(res.detail);
      }
      const res: SuccessResult<T> = await response.json();
      return res.items;
    },
    initialData: [],
  });
  return { isLoading, data };
}

export default function ManageDomains() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-details-domains", false);
  const { isLoading, data: domains } = useSpaceship<DomainInfo>("domains");

  function formatDate(date: string) {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
    const formattedDate = new Date(date).toLocaleDateString("en-US", options);
    return formattedDate;
  }

  function generateAccessories(domain: DomainInfo) {
    const accessories: List.Item.Accessory[] = [
      { tag: domain.privacyProtection.level === "high" ? "Private" : "Public", tooltip: "Privacy" },
    ];
    accessories.push({
      tag: domain.eppStatuses.includes(DomainClientEPPStatus.clientTransferProhibited)
        ? { value: "LOCKED", color: Color.Green }
        : { value: "UNLOCKED", color: Color.Red },
      tooltip: "Transfer lock",
    });
    accessories.push({
      date: new Date(domain.expirationDate),
      tooltip: `Expires on ${formatDate(domain.expirationDate)}`,
    });
    return accessories;
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

function ManageDNSRecords({ domain }: { domain: DomainInfo }) {
  const { isLoading, data: records } = useSpaceship<ResourceRecord>(`dns/records/${domain.name}`);

  function generateAccessories(record: ResourceRecord) {
    const accessories: List.Item.Accessory[] = [{ tag: record.type, tooltip: "Type" }];

    if (record.address) accessories.unshift({ icon: Icon.Text, text: record.address, tooltip: "Address" });
    else if (record.value) accessories.unshift({ icon: Icon.Text, text: record.value, tooltip: "Value" });

    return accessories;
  }

  return (
    <List isLoading={isLoading}>
      {domain.nameservers.provider === "custom" && (
        <List.EmptyView
          icon={Icon.Store}
          title="Managed with Custom DNS"
          description="To manage your records here, change nameservers back to Spaceship DNS. You can even choose to see your inactive records and prepare them before changing back."
        />
      )}
      {records.map((record, index) => (
        <List.Item
          key={index}
          icon={Icon.Store}
          title={record.name}
          subtitle={`.${domain.name}`}
          accessories={generateAccessories(record)}
        />
      ))}
    </List>
  );
}
