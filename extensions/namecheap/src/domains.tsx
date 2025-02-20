import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useListDomainDNSHosts, useListDomainDNSServers, useListDomains } from "./namecheap";
import { getFavicon } from "@raycast/utils";

export default function ListDomains() {
    const { isLoading, data: domains } = useListDomains();

    return <List isLoading={isLoading} isShowingDetail>
        {domains.map(domain => <List.Item key={domain.ID} icon={getFavicon(`https://${domain.Name}`, { fallback: Icon.Globe })} title={domain.Name} accessories={[
            domain.WhoisGuard==="ENABLED" ? {icon: Icon.Info, tooltip: "Domain Privacy protection is ON"} : {}
        ]} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Expired" icon={domain.IsExpired ? Icon.Check : Icon.Xmark} />
            <List.Item.Detail.Metadata.Label title="Locked" icon={domain.IsLocked ? Icon.Check : Icon.Xmark} />
            <List.Item.Detail.Metadata.Label title="Premium" icon={domain.IsPremium ? Icon.Check : Icon.Xmark} />
        </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.Push icon={Icon.Text} title="View DNS Servers" target={<ListDomainDNSServers domainName={domain.Name} />} />
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.Push icon={Icon.List} title="View DNS Hosts" target={<ListDomainDNSHosts domainName={domain.Name} />} />
        </ActionPanel>} />)}
    </List>
}

function ListDomainDNSServers({domainName}: {domainName: string}) {
    const parts = domainName.split(".");
    const sld = parts.slice(0, -1).join(".");
    const tld = parts[parts.length - 1];

    const { isLoading, data } = useListDomainDNSServers(sld, tld);

    const markdown = `## ${domainName} \n\n ${!data ? "" : data.Nameserver.join(`\n\n`)}`
    return <Detail isLoading={isLoading} markdown={markdown} />
}

function ListDomainDNSHosts({domainName}: {domainName: string}) {
    const parts = domainName.split(".");
    const sld = parts.slice(0, -1).join(".");
    const tld = parts[parts.length - 1];

    const { isLoading, data: hosts } = useListDomainDNSHosts(sld, tld);

    return <List isLoading={isLoading} isShowingDetail>
        {hosts.map(host => <List.Item key={host.HostId} title={host.Name} detail={<List.Item.Detail markdown={host.Address} />} />)}
    </List>
}