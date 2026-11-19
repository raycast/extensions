import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { consoleUrl, failToast, getJson } from "./api";
import { relative } from "./format";
import { ChooseScreen } from "./pickers";
import { Playlist } from "./types";

export default function SearchPlaylists() {
  const { data, isLoading, revalidate } = useCachedPromise(() => getJson<Playlist[]>("/v1/playlists"), [], {
    onError: failToast("Could not load playlists"),
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search playlists by name">
      <List.EmptyView icon={Icon.List} title="No playlists" description="Make a playlist in Brix to see it here." />
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
