import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AMP_URL, projectSlug, searchThreads, threadURL, type Project } from "../lib/amp";
import { readyThreads } from "../lib/inbox";
import { useLiveThreads } from "../lib/live";
import { lookUpPortals } from "../lib/portals";
import { OpenThreadAction, RecoveryActions } from "../lib/ui";
import { NewThreadForm } from "./new-thread-form";
import { ThreadListItem } from "./thread-list-item";
import type { Seen } from "../lib/inbox";

const repoQuery = (p: Project) => `repo:${p.repositoryURL.replace(/^https?:\/\//, "")}`;

/** One project: working threads pinned, then the rest, then the portals of its running orbs. */
export function ProjectView({ project, seen, onChange }: { project: Project; seen?: Seen; onChange?: () => void }) {
  const slug = projectSlug(project);
  const { data, isLoading, revalidate, error } = useCachedPromise(searchThreads, [repoQuery(project)], {
    keepPreviousData: true,
  });
  const live = new Map(useLiveThreads().map((t) => [t.id, t]));
  const ready = new Set(readyThreads([...live.values()], seen ?? {}).map((t) => t.id));
  const portals = useCachedPromise(lookUpPortals, [], { keepPreviousData: true });
  const projectPortals = (portals.data ?? []).filter((o) => o.thread.project === project.name);

  const threads = data ?? [];
  const working = threads.filter((t) => live.get(t.id)?.working);
  const rest = threads.filter((t) => !live.get(t.id)?.working);
  const refresh = () => {
    revalidate();
    onChange?.();
  };
  const newThread = (
    <Action.Push
      title="New Thread in Project"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<NewThreadForm project={slug} navigationTitle={`New Thread in ${slug}`} />}
    />
  );

  return (
    <List
      isLoading={isLoading || portals.isLoading}
      navigationTitle={slug}
      searchBarPlaceholder={`Search threads in ${project.name}…`}
    >
      {error && !threads.length ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't reach Amp"
          description={error.message}
          actions={<RecoveryActions onRetry={revalidate} />}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Bubble}
          title={`No threads in ${slug}`}
          actions={<ActionPanel>{newThread}</ActionPanel>}
        />
      )}
      <List.Section title="Working" subtitle={working.length ? String(working.length) : undefined}>
        {working.map((t) => (
          <ThreadListItem key={t.id} thread={t} live={live.get(t.id)} showProject={false} onChange={refresh}>
            <ActionPanel.Section>{newThread}</ActionPanel.Section>
          </ThreadListItem>
        ))}
      </List.Section>
      <List.Section title="Threads" subtitle={rest.length ? String(rest.length) : undefined}>
        {rest.map((t) => (
          <ThreadListItem
            key={t.id}
            thread={t}
            live={live.get(t.id)}
            ready={ready.has(t.id)}
            showProject={false}
            onChange={refresh}
          >
            <ActionPanel.Section>{newThread}</ActionPanel.Section>
          </ThreadListItem>
        ))}
      </List.Section>
      <List.Section title="Portals">
        {projectPortals.flatMap(({ thread, portals }) =>
          portals.map((p) => (
            <List.Item
              key={p.url}
              title={p.title}
              subtitle={thread.title ?? undefined}
              icon={Icon.Globe}
              keywords={[thread.title ?? ""]}
              accessories={[{ text: new URL(p.url).hostname.match(/-p(\d+)\./)?.[1] ?? "", icon: Icon.Plug }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={p.url} />
                  <OpenThreadAction id={thread.id} title="Open Thread in Amp" />
                  <Action.CopyToClipboard title="Copy Portal URL" content={p.url} />
                  <Action.CopyToClipboard title="Copy Thread URL" content={threadURL(thread.id)} />
                </ActionPanel>
              }
            />
          )),
        )}
      </List.Section>
      {/* Shown once threads load, so this row doesn't take the initial selection. */}
      {data && (
        <List.Section title="Project">
          <List.Item
            title="Open Project on Ampcode.com"
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`${AMP_URL}/@${slug}`} />
                <Action.OpenInBrowser title="Open Repository" url={project.repositoryURL} />
                <Action.CopyToClipboard title="Copy Slug" content={slug} />
                {newThread}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
