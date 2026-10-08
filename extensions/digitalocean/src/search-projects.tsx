import { useProjects } from "./client";
import { Action, ActionPanel, Detail, List } from "@raycast/api";

export default function Command() {
  const { data, error, isLoading } = useProjects();

  if (error) {
    return <Detail markdown={`Failed to list database clusters: ${error.message}`} />;
  }

  return (
    <List isLoading={isLoading} isShowingDetail={true}>
      {data?.projects.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          subtitle={project.is_default ? "default" : project.environment}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Browser"
                url={`https://cloud.digitalocean.com/projects/${project.id}`}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Description" text={project.description || "Not specified"} />
                  <List.Item.Detail.Metadata.Label title="Purpose" text={project.purpose || "Not specified"} />
                  <List.Item.Detail.Metadata.Label title="Environment" text={project.environment || "Not specified"} />
                  <List.Item.Detail.Metadata.Label
                    title="Created At"
                    text={new Date(project.created_at).toLocaleDateString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Updated At"
                    text={new Date(project.updated_at).toLocaleDateString()}
                  />
                  <List.Item.Detail.Metadata.Label title="Default" text={String(project.is_default || false)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
