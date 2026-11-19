import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { accountId, consoleUrl, getJson, sameAccount } from "./api";
import { ErrorView } from "./error-view";
import { relative } from "./format";
import { ChooseScreen } from "./pickers";
import { Playlist } from "./types";

export default function SearchPlaylists() {
  // The account id keeps each key's list apart in the cache.
  const { data, error, isLoading, revalidate } = useCachedPromise(
    (account: string) => {
      sameAccount(account);
      return getJson<Playlist[]>("/v1/playlists");
    },
    [accountId()],
    { failureToastOptions: { title: "Could not load playlists" } },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search playlists by name">
      {error && !data?.length ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.List} title="No playlists" description="Make a playlist in Brix to see it here." />
      )}
      {(data ?? []).map((p) => {
        const items = p.items?.length ?? 0;
        const screens = p.usedByScreenCount ?? 0;
        return (
          <List.Item
            key={p.id}
            icon={Icon.List}
            title={p.name}
            subtitle={p.description || undefined}
            accessories={[
              ...(p.approvalState === "pending" ? [{ tag: "Waiting for approval" }] : []),
              ...(p.approvalState === "rejected" ? [{ tag: "Rejected" }] : []),
              { text: `${items} ${items === 1 ? "item" : "items"}`, tooltip: "Items" },
              { icon: Icon.Monitor, text: String(screens), tooltip: `${screens} screens play it` },
              { date: new Date(p.updatedAt), tooltip: `Changed ${relative(p.updatedAt)}` },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Brix" url={consoleUrl.playlist(p.id)} />
                <Action.Push
                  title="Play on Screen"
                  icon={Icon.Play}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "p" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "p" },
                  }}
                  target={<ChooseScreen contentKind="playlist" contentId={p.id} contentName={p.name} />}
                />
                <Action.CopyToClipboard
                  title="Copy Playlist ID"
                  content={p.id}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard title="Copy Link" content={consoleUrl.playlist(p.id)} />
                <Action
                  title="Refresh List"
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
