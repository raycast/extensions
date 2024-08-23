import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useListDomains, useParsedDNSZone } from "./lib/hooks";
import { DEFAULT_ICON } from "./lib/constants";

export default function Domains() {
  const { isLoading, data } = useListDomains();

  return (
    <List isLoading={isLoading}>
      {data && (
        <>
          <List.Section title="Main Domain">
            <Domain domain={data.main_domain} />
          </List.Section>
          <List.Section title="Addon Domains">
            {data.addon_domains.map((domain) => (
              <Domain key={domain} domain={domain} />
            ))}
          </List.Section>
          <List.Section title="Sub Domains">
            {data.sub_domains.map((domain) => (
              <Domain key={domain} domain={domain} showAction={false} />
            ))}
          </List.Section>
          <List.Section title="Parked Domains">
            {data.parked_domains.map((domain) => (
              <Domain key={domain} domain={domain} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function Domain({ domain, showAction = true }: { domain: string; showAction?: boolean }) {
  return (
    <List.Item
      title={domain}
      icon={getFavicon(`https://${domain}`, { fallback: DEFAULT_ICON })}
      actions={
        showAction && (
          <ActionPanel>
            <Action.Push icon={Icon.Eye} title="View DNS Zone" target={<ViewDNSZone zone={domain} />} />
          </ActionPanel>
        )
      }
    />
  );
}

function ViewDNSZone({ zone }: { zone: string }) {
  const { isLoading, data } = useParsedDNSZone(zone);

  return (
    <List isLoading={isLoading}>
      <List.Section title={`Domains / ${zone} / DNS Zone`}>
        {data
          ?.filter((zoneItem) => !["SOA", "NS"].includes(zoneItem.record_type))
          .map((zoneItem) => {
            const subtitle = zoneItem.dname.includes(zone) ? undefined : `.${zone}.`;
            return (
              <List.Item
                key={zoneItem.line_index}
                title={zoneItem.dname}
                subtitle={subtitle}
                accessories={[{ tag: zoneItem.record_type }]}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
