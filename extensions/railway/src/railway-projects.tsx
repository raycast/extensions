import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { fetchProjects, projectUrl, railwayWebUrl } from "./railway";
import { getFavicon, useCachedPromise } from "@raycast/utils";

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
      {!isLoading && !projects.length && (
        <List.EmptyView
          title="Create a New Project"
          description="No projects found"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={getFavicon(`${railwayWebUrl}/new`)}
                title="Create New Project"
                url={`${railwayWebUrl}/new`}
              />
            </ActionPanel>
          }
        />
      )}
      {projects.map((p) => (
        <List.Item
          key={p.id}
          icon={p.isPublic ? Icon.Eye : Icon.EyeDisabled}
          title={p.name}
          subtitle={p.description}
          accessories={[{ date: new Date(p.updatedAt) }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Project Architecture" url={projectUrl(p.id)} />
                <Action.OpenInBrowser
                  title="Project Settings"
                  url={projectUrl(p.id, "settings")}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
                <Action.OpenInBrowser
                  title="Project Observability"
                  url={projectUrl(p.id, "observability")}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.OpenInBrowser
                  title="Project Logs"
                  url={projectUrl(p.id, "logs")}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
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
