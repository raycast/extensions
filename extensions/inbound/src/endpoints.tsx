import { List, Icon, ActionPanel, Action, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { APP_URL, inbound } from "./inbound";
import { EndpointWithStats } from "./types";

const ENDPOINT_ICONS: Record<EndpointWithStats["type"], Icon> = {
  webhook: Icon.Bolt,
  email: Icon.Envelope,
  email_group: Icon.TwoPeople,
};
export default function Endpoints() {
  const { isLoading, data: endpoints } = useCachedPromise(
    async () => {
      const { data } = await inbound.endpoints.list();
      return data;
    },
    [],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && !endpoints.length ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No endpoints configured"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${APP_URL}/endpoints`} />
            </ActionPanel>
          }
        />
      ) : (
        endpoints.map((endpoint) => (
          <List.Item
            key={endpoint.id}
            icon={ENDPOINT_ICONS[endpoint.type]}
            title={endpoint.name}
            subtitle={`API ID: ${endpoint.id}`}
            accessories={[
              {
                tag: endpoint.isActive
                  ? { value: "Active", color: Color.Blue }
                  : { value: "Inactive", color: Color.Red },
              },
              {
                text: new Date(endpoint.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`${APP_URL}/endpoints`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
