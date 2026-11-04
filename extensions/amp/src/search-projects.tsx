import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AMP_URL, listProjects, projectSlug } from "./lib/amp";
import { NewThreadForm } from "./components/new-thread-form";
import { ThreadListItem } from "./components/thread-list-item";
import { searchThreads } from "./lib/amp";

function ProjectThreads({ repo, slug }: { repo: string; slug: string }) {
  const { data, isLoading, revalidate } = useCachedPromise(
    (r: string) => searchThreads(`repo:${r.replace(/^https?:\/\//, "")}`),
    [repo],
  );
  return (
    <List isLoading={isLoading} navigationTitle={slug} searchBarPlaceholder={`Threads in ${slug}`}>
      {(data ?? []).map((t) => (
        <ThreadListItem key={t.id} thread={t} onChange={revalidate} />
      ))}
    </List>
  );
}

export default function SearchProjects() {
  const { data, isLoading, error } = useCachedPromise(listProjects);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects">
      {error && <List.EmptyView icon={Icon.Warning} title="Couldn't reach Amp" description={error.message} />}
      {(data ?? []).map((p) => {
        const slug = projectSlug(p);
        const host = p.repositoryURL.includes("github.com") ? "GitHub" : "Amp";
        return (
          <List.Item
            key={p.id}
            title={slug}
            subtitle={p.description}
            icon={Icon.Folder}
            keywords={[p.name, p.namespace]}
            accessories={[{ tag: host }]}
            actions={
              <ActionPanel>
                <Action.Push title="New Thread" icon={Icon.Plus} target={<NewThreadForm project={slug} />} />
                <Action.Push
                  title="Show Threads"
                  icon={Icon.List}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  target={<ProjectThreads repo={p.repositoryURL} slug={slug} />}
                />
                <Action.OpenInBrowser title="Open Project" url={`${AMP_URL}/@${slug}`} />
                <Action.OpenInBrowser title="Open Repository" url={p.repositoryURL} />
                <Action.CopyToClipboard title="Copy Slug" content={slug} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
