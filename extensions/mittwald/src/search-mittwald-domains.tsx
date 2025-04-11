import { ActionPanel, Action, Icon, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Preferences {
  token: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading: isLoadingIngresses, data: ingresses } = useFetch<
    { hostname: string; isEnabled: boolean; id: string; projectId: string }[]
  >("https://api.mittwald.de/v2/ingresses", {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${preferences.token}`,
    },
    keepPreviousData: true,
  });

  const { isLoading: isLoadingProjects, data: projects } = useFetch<
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
    <List isLoading={(!ingresses && isLoadingIngresses) || (!projects && isLoadingProjects)}>
      {ingresses?.map((ingress) => {
        const project = projects?.find((project) => project.id === ingress.projectId);

        return (
          <List.Item
            key={ingress.id}
            icon={ingress.isEnabled ? Icon.Globe : Icon.Xmark}
            title={ingress.hostname}
            subtitle={`${project?.description}`}
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
        );
      })}
    </List>
  );
}
