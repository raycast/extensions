import { ActionPanel, Action, Icon, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Preferences {
  token: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading: isLoadingInstallations, data: installations } = useFetch<
    { id: string; appId: string; description: string; projectId: string }[]
  >("https://api.mittwald.de/v2/app-installations", {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.token}`,
    },
    keepPreviousData: true,
  });

  const { isLoading: isLoadingApps, data: apps } = useFetch<{ id: string; name: string; tags: string[] }[]>(
    "https://api.mittwald.de/v2/apps",
    {
      method: "get",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${preferences.token}`,
      },
      keepPreviousData: true,
    },
  );

  return (
    <List isLoading={!installations && !apps && isLoadingInstallations && isLoadingApps}>
      {installations?.map((installation) => {
        const app = apps?.find((app) => app.id === installation.appId);

        return (
          <List.Item
            key={installation.id}
            icon={Icon.AppWindowList}
            title={`${app?.name}: ${installation.description}`}
            subtitle={app?.tags.join(", ")}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={`https://studio.mittwald.de/app/projects/${installation.projectId}/apps/${installation.id}/general`}
                ></Action.OpenInBrowser>
                <Action.CopyToClipboard
                  content={`https://studio.mittwald.de/app/projects/${installation.projectId}/apps/${installation.id}/general`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
