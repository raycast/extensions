import { getFavicon, useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "./config";
import { Domain, DomainZone, Result } from "./types";
import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";

export default function ListDomains() {
  const { isLoading, data: domains } = useFetch(API_URL + "domains", {
    headers: API_HEADERS,
    mapResult(result: Result<Domain[]>) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {domains.map((domain) => (
        <List.Item
          key={domain.id}
          icon={getFavicon(`https://${domain.domain}`, { fallback: Icon.Globe })}
          title={domain.domain}
          accessories={[{ tag: { value: "AUTO_RENEW", color: domain.auto_renew ? Color.Green : Color.Red } }]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.List} title="View Domain Zone" target={<ViewDomainZone domain={domain} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ViewDomainZone({ domain }: { domain: Domain }) {
  const { isLoading, data: zone } = useFetch(API_URL + `domains/${domain.id}/zone`, {
    headers: API_HEADERS,
    mapResult(result: Result<DomainZone>) {
      return {
        data: result.data,
      };
    },
    onError() {},
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={`Domain: ${domain.domain}` + (!zone ? "" : `\n\n Name Servers: \n\n ${zone.name_servers.join("\n\n")}`)}
      metadata={
        zone && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="ID" text={zone.id} />
            <Detail.Metadata.Label title="Name" text={zone.name} />
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={zone.status} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Activated At" text={zone.activated_at} />
            <Detail.Metadata.Label title="Created At" text={zone.created_at} />
            <Detail.Metadata.Label title="Updated At" text={zone.updated_at} />
          </Detail.Metadata>
        )
      }
    />
  );
}
