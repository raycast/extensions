import { Action, ActionPanel, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useListDomains, useParsedDNSZone } from "./lib/hooks";

export default function Domains() {
    const { isLoading, data } = useListDomains();

    return <List isLoading={isLoading}>
        {data && <>
            <List.Section title="Main Domain">
                <List.Item title={data.main_domain} icon={getFavicon(`https://${data.main_domain}`)} actions={<ActionPanel>
                    <Action.Push title="View DNS Zone" target={<ViewDNSZone zone={data.main_domain} />} />
                </ActionPanel>} />
            </List.Section>
        </>}
    </List>
}

function ViewDNSZone({ zone }: { zone: string }) {
    const { isLoading, data } = useParsedDNSZone(zone);

    return <List isLoading={isLoading}>
        <List.Section title={`Domains / ${zone} / DNS Zone`}>
            {data?.filter(zoneItem => !["SOA", "NS"].includes(zoneItem.record_type)).map(zoneItem => {
                const subtitle = zoneItem.dname_b64.includes(zone) ? undefined : `.${zone}.`;
                return <List.Item key={zoneItem.line_index} title={zoneItem.dname_b64} subtitle={subtitle} accessories={[{tag: zoneItem.record_type}]} />;
            })}
        </List.Section>
    </List>
}