import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useGetActiveDomains } from "./hooks";
import { getFavicon, useCachedState } from "@raycast/utils";

export default function MyDomains() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("domains-show-details", false);
  const { isLoading, data: domains } = useGetActiveDomains();

  return <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
    {domains.map(domain => {
      const status = domain.internal_status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
      return <List.Item key={domain.domain_id} icon={getFavicon(`https://${domain.domain_name}`, { fallback: Icon.Globe })} title={domain.domain_name} subtitle={isShowingDetail ? undefined : status} accessories={isShowingDetail ? undefined : [
        { icon: domain.auto_renew_enabled==="1" ? Icon.Check : Icon.Xmark, text: "Auto Renew" },
        { icon: domain.whois_privacy_enabled==="1" ? { source: Icon.Lock, tintColor: Color.Green } : Icon.LockDisabled, text: "Whois Privacy" },
        { date: new Date(+domain.date_expiration*1000), tooltip: `Expiration Date: ${new Date(+domain.date_expiration*1000).toDateString()}` }
      ]} detail={<List.Item.Detail markdown={`# Nameservers \n\n ${domain.ns_1} \n\n ${domain.ns_2}`} metadata={<List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="ID" text={domain.domain_id} />
        <List.Item.Detail.Metadata.Label title="Domain" text={domain.domain_name} />
        <List.Item.Detail.Metadata.Label title="Status" text={status} />
        <List.Item.Detail.Metadata.Label title="Date Registered" text={new Date(+domain.date_registered*1000).toDateString()} />
        <List.Item.Detail.Metadata.Label title="Date Expiring" text={new Date(+domain.date_registered*1000).toDateString()} />
        <List.Item.Detail.Metadata.Label title="Auto Renew" text={domain.auto_renew_enabled==="1" ? "Enabled" : "Disabled"} />
        <List.Item.Detail.Metadata.Label title="Whois Privacy" text={domain.whois_privacy_enabled==="1" ? "Enabled" : "Disabled"} />
      </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
        <Action icon={Icon.AppWindowSidebarLeft} title="Toggle Details" onAction={() => setIsShowingDetail(prev => !prev)} />
      </ActionPanel>} />
    })}
  </List>
}