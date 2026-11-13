import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ThreadView } from "./components/thread-view";
import { threadURL } from "./lib/amp";
import { lookUpPortals, type OrbPortals } from "./lib/portals";
import { OpenThreadAction, RecoveryActions } from "./lib/ui";

const portOf = (url: string) => new URL(url).hostname.match(/-p(\d+)\./)?.[1];

export default function OpenPortal() {
  const { data, isLoading, error, revalidate } = useCachedPromise(lookUpPortals, [], { keepPreviousData: true });
  const orbs = data ?? [];
  const byProject = new Map<string, OrbPortals[]>();
  for (const orb of orbs) {
    const project = orb.thread.project || "No project";
    byProject.set(project, [...(byProject.get(project) ?? []), orb]);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search portals, threads, and projects…">
      {error && !orbs.length ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't list portals"
          description={error.message}
          actions={<RecoveryActions onRetry={revalidate} />}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Network}
          title="No portals open"
          description="Ask an agent to start a dev server and give you a portal link."
        />
      )}
      {[...byProject].map(([project, projectOrbs]) => (
        <List.Section key={project} title={project}>
          {projectOrbs.flatMap(({ thread, portals }) =>
            portals.map((p) => (
              <List.Item
                key={p.url}
                title={p.title}
                subtitle={thread.title ?? "Untitled thread"}
                icon={Icon.Globe}
                keywords={[thread.title ?? "", thread.project]}
                accessories={[
                  ...(thread.working ? [{ tag: { value: "working", color: Color.Green } }] : []),
                  { text: portOf(p.url) ? `:${portOf(p.url)}` : undefined, tooltip: new URL(p.url).hostname },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser url={p.url} />
                      <Action.Push
                        title="Show Thread"
                        icon={Icon.Message}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        target={<ThreadView id={thread.id} title={thread.title ?? "Untitled thread"} />}
                      />
                      <OpenThreadAction id={thread.id} title="Open Thread in Amp" />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard title="Copy Portal URL" content={p.url} />
                      <Action.CopyToClipboard title="Copy Thread URL" content={threadURL(thread.id)} />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            )),
          )}
        </List.Section>
      ))}
    </List>
  );
}
