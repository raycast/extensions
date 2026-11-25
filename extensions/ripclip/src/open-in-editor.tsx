import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { api, editorUrl, Project, SITE } from "./ripclip";

const projects = async () => (await api<{ projects: Project[] }>("/projects?limit=50")).projects;

export default function OpenInEditor() {
  const { data, error, isLoading, revalidate } = useCachedPromise(projects, [], { keepPreviousData: true });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your videos">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load your videos"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView icon={Icon.Video} title="No videos yet" description="Import one with Import Video Link" />
      )}
      {data?.map((p) => (
        <List.Item
          key={p.project_id}
          icon={Icon.Video}
          title={p.name || "Untitled video"}
          accessories={[{ date: new Date(p.updated_at * 1000) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Editor" url={editorUrl(p.project_id)} />
              <Action.CopyToClipboard title="Copy Editor Link" content={editorUrl(p.project_id)} />
              <Action.OpenInBrowser title="Open RipClip" url={SITE} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
