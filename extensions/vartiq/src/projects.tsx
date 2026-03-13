import { useCachedPromise } from "@raycast/utils";
import { vartiq } from "./vartiq";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import Webhooks from "./webhooks";

export default function Projects() {
  const { isLoading, data: projects } = useCachedPromise(
    async () => {
      const { data } = await vartiq.project.list();
      return data;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={Icon.Folder}
          title={project.name}
          subtitle={project.id}
          accessories={[{ text: `Number of Apps: ${project.appCount}` }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Layers}
                title="Apps"
                target={<Apps projectId={project.id} navigationTitle={`Projects / ${project.name} / Apps`} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Apps({ projectId, navigationTitle }: { projectId: string; navigationTitle: string }) {
  const { isLoading, data: apps } = useCachedPromise(
    async (projectId: string) => {
      const { data } = await vartiq.app.list(projectId);
      return data;
    },
    [projectId],
    {
      initialData: [],
    },
  );

  return (
    <List navigationTitle={navigationTitle} isLoading={isLoading}>
      {apps.map((app) => (
        <List.Item
          key={app.id}
          id={app.id}
          icon={Icon.Layers}
          title={app.name}
          subtitle={app.id}
          accessories={[{ date: new Date(app.createdAt) }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon="webhook.svg"
                title="Webhooks"
                target={<Webhooks appId={app.id} navigationTitle={`... / ${app.name} / Webhooks`} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
