import { List, Icon, Color, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";
import EndpointDetail from "./endpoint-detail";

// ... interfaces inchangées

export default function Command() {
  const { gatusUrl, authToken } = getPreferenceValues<Preferences>();
  const baseUrl = gatusUrl.replace(/\/$/, "");

  const { data, isLoading, error, revalidate } = useFetch<GatusEndpoint[]>(`${baseUrl}/api/v1/endpoints/statuses`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    keepPreviousData: true,
  });

  useEffect(() => {
    const interval = setInterval(() => revalidate(), 30_000);
    return () => clearInterval(interval);
  }, [revalidate]);

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Cannot contact Gatus" description={error.message} />
      </List>
    );
  }

  const groups = new Map<string, GatusEndpoint[]>();
  (data ?? []).forEach((endpoint) => {
    const groupName = endpoint.group || "Without groupe";
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push(endpoint);
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Endpoint seeking...">
      {[...groups.entries()].map(([groupName, endpoints]) => (
        <List.Section title={groupName} key={groupName}>
          {endpoints.map((endpoint) => {
            const lastResult = endpoint.results[endpoint.results.length - 1];
            const isUp = lastResult?.success;

            return (
              <List.Item
                key={endpoint.key}
                icon={{ source: Icon.Circle, tintColor: isUp ? Color.Green : Color.Red }}
                title={endpoint.name}
                subtitle={lastResult ? `HTTP ${lastResult.status}` : "No data"}
                accessories={[
                  {
                    tag: { value: isUp ? "UP" : "DOWN", color: isUp ? Color.Green : Color.Red },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="See Details"
                      icon={Icon.Sidebar}
                      target={
                        <EndpointDetail
                          endpointKey={endpoint.key}
                          endpointName={endpoint.name}
                          baseUrl={baseUrl}
                          authToken={authToken}
                        />
                      }
                    />
                    <Action title="Rafraîchir" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
