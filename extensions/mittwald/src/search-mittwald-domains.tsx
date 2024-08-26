import { ActionPanel, Action, Icon, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Preferences {
  token: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data: ingresses } = useFetch<
    { hostname: string; isEnabled: boolean; id: string; projectId: string }[]
  >("https://api.mittwald.de/v2/ingresses", {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.token}`,
    },
    keepPreviousData: true,
  });

  return (
    <List isLoading={!ingresses && !isLoading}>
      {ingresses?.map((ingress) => (
        <List.Item
          key={ingress.id}
          icon={Icon.Globe}
          title={ingress.hostname}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://studio.mittwald.de/app/projects/${ingress.projectId}/domain/domains/${ingress.id}/details`}
              ></Action.OpenInBrowser>
              <Action.CopyToClipboard
                content={`https://studio.mittwald.de/app/projects/${ingress.projectId}/domain/domains/${ingress.id}/details`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
