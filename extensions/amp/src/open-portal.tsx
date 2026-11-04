import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { threadURL } from "./lib/amp";
import { lookUpPortals } from "./lib/portals";
import { OpenThreadAction } from "./lib/ui";

export default function OpenPortal() {
  const { data, isLoading, error, revalidate } = useCachedPromise(lookUpPortals, [], { keepPreviousData: true });
  const orbs = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search portals">
      {error && !orbs.length ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't list portals"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Network}
          title="No portals open"
          description="Ask an agent to start a dev server and give you a portal link."
        />
      )}
      {orbs.map(({ thread, portals }) => (
        <List.Section key={thread.id} title={thread.title ?? "Untitled thread"} subtitle={thread.project}>
          {portals.map((p) => (
            <List.Item
              key={p.url}
              title={p.title}
              subtitle={new URL(p.url).hostname}
              icon={Icon.Window}
              keywords={[thread.title ?? "", thread.project]}
              accessories={thread.working ? [{ tag: "working" }] : []}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={p.url} />
                  <OpenThreadAction id={thread.id} />
                  <Action.CopyToClipboard title="Copy Portal URL" content={p.url} />
                  <Action.CopyToClipboard title="Copy Thread URL" content={threadURL(thread.id)} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
