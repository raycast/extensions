import { ActionPanel, Action, Icon, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Preferences {
  token: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data: projects } = useFetch<
    { customerId: string; description: string; id: string; enabled: boolean }[]
  >("https://api.mittwald.de/v2/projects", {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.token}`,
    },
    keepPreviousData: true,
  });

  return (
    <List isLoading={!projects && isLoading}>
      {projects?.map((project) => (
        <List.Item
          key={project.id}
          icon={Icon.Folder}
          title={project.description}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://studio.mittwald.de/app/projects/${project.id}/dashboard`}
              ></Action.OpenInBrowser>
              <Action.CopyToClipboard content={`https://studio.mittwald.de/app/projects/${project.id}/dashboard`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
