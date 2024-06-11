import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { Domain, type DomainInfo } from "./lib/types";
import { getFavicon } from "@raycast/utils";

export default function Domains() {
    const { isLoading, data } = useNameSilo<{domains: Domain[] | null}>("listDomains");
    
    return <List isLoading={isLoading}>
        {data?.domains?.map(domain => <List.Item key={domain.domain} icon={getFavicon(`https://${domain.domain}`, { fallback: Icon.Globe })} title={domain.domain} accessories={[
            { text: `created: ${domain.created}` },
            { text: `expires: ${domain.expires}` }
        ]} actions={<ActionPanel>
            <Action.Push title="Get Domain Info" target={<DomainInfo domain={domain.domain} />} />
        </ActionPanel>} />)}
    </List>
}

function DomainInfo({ domain }: { domain: string }) {
    const { isLoading, data } = useNameSilo<DomainInfo>("getDomainInfo", new URLSearchParams({
        domain
    }));
    return <Detail isLoading={isLoading} navigationTitle={`Domains / ${domain} / Info`} metadata={data && <Detail.Metadata>
        <Detail.Metadata.Label title="Created" text={data.created} />
        <Detail.Metadata.Label title="Expires" text={data.expires} />
        <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={data.status} color={data.status==="Active" ? Color.Green : Color.Red} />
        </Detail.Metadata.TagList>
        <Detail.Metadata.Label title="Locked" text={data.locked ? "✅" : "❌"} />
        <Detail.Metadata.Label title="Private" text={data.private ? "✅" : "❌"} />
        <Detail.Metadata.Label title="Auto Renew" text={data.auto_renew ? "✅" : "❌"} />
        <Detail.Metadata.Label title="Email Verification Required" text={data.email_verification_required ? "✅" : "❌"} />
        <Detail.Metadata.TagList title="Nameservers">
            {data.nameservers.sort((a, b) => a.position - b.position).map(nameserver => <Detail.Metadata.TagList.Item key={nameserver.position} text={nameserver.nameserver} />)}
        </Detail.Metadata.TagList>
        <Detail.Metadata.Separator />
        <Detail.Metadata.Label title="Contact ID" />
        <Detail.Metadata.Label title="registrant" text={data.contact_ids.registrant} />
        <Detail.Metadata.Label title="administrative" text={data.contact_ids.administrative} />
        <Detail.Metadata.Label title="technical" text={data.contact_ids.technical} />
        <Detail.Metadata.Label title="billing" text={data.contact_ids.billing} />
    </Detail.Metadata>} />
}