import { ActionPanel, List, Action } from "@raycast/api";
import { fetchProjects, projectUrl } from "./railway";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  return <ListProjects />;
}

const ListProjects: React.FC = () => {
  const { isLoading, data: projects } = useCachedPromise(
    async () => {
      return await fetchProjects();
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search project">
      {projects.map((p) => (
        <List.Item
          key={p.id}
          title={p.name}
          subtitle={p.description}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Project Settings" url={projectUrl(p.id, "settings")} />
                <Action.OpenInBrowser title="Project Deployments" url={projectUrl(p.id, "deployments")} />
                <Action.OpenInBrowser
                  title="Latest Deployment"
                  url={projectUrl(p.id, "deployments?open=true")}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
                <Action.OpenInBrowser
                  title="Project Variables"
                  url={projectUrl(p.id, "variables")}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
                <Action.OpenInBrowser
                  title="Project Metrics"
                  url={projectUrl(p.id, "metrics")}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Project URL"
                  content={projectUrl(p.id)}
                  shortcut={{ modifiers: ["opt"], key: "c" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
