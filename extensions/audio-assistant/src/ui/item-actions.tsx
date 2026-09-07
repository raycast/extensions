import { KeyboardShortcutsAction } from "./shortcut-settings-view";
import { Action, ActionPanel, Clipboard, Icon, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import type { Artist, Album, Item } from "../domain/model";
import { SessionRoute, useMusic } from "./session";
import { PlayerActions } from "./player-actions";
import { QueueView } from "./queue-view";
import { NowPlayingView } from "./now-playing-view";
import { useShortcuts } from "./use-shortcuts";

export function ItemActions({ item, openCollection }: { item?: Item; openCollection: (item: Artist | Album) => void }) {
  const shortcuts = useShortcuts();
  const { controller, run, refresh, bridge } = useMusic();
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {item?.kind === "player" && (
          <Action
            title="Set Active Player"
            icon={Icon.Checkmark}
            onAction={() => run(() => controller.select(item.id), `${item.name} selected`)}
          />
        )}
        {item?.kind === "track" && (
          <>
            <Action
              title="Play Now"
              icon={Icon.Play}
              onAction={() => run(() => controller.enqueue(item, "play-now"), `Playing ${item.name}`)}
            />
            <Action
              title="Play Next"
              icon={Icon.Forward}
              shortcut={shortcuts.playNext}
              onAction={() => run(() => controller.enqueue(item, "play-next"), "Added to play next")}
            />
            <Action
              title="Add to Queue"
              icon={Icon.Plus}
              shortcut={shortcuts.addToQueue}
              onAction={() => run(() => controller.enqueue(item, "add"), "Added to queue")}
            />
          </>
        )}
        {(item?.kind === "artist" || item?.kind === "album") && (
          <Action
            title={item.kind === "artist" ? "Browse Artist" : "Browse Album"}
            icon={Icon.Cd}
            shortcut={item.kind === "artist" ? shortcuts.browseArtist : shortcuts.browseAlbum}
            onAction={() => openCollection(item)}
          />
        )}
      </ActionPanel.Section>
      <PlayerActions highlighted={item?.kind === "player" ? item : undefined} />
      {item?.kind === "track" && (
        <ActionPanel.Section title="Related Music">
          {item.albumItem && (
            <Action
              title="Browse Track Album"
              icon={Icon.Cd}
              shortcut={shortcuts.browseAlbum}
              onAction={() => openCollection(item.albumItem!)}
            />
          )}
          {item.artists?.map((artist, idx) => (
            <Action
              key={artist.uri}
              title={`Browse Artist: ${artist.name}`}
              icon={Icon.Person}
              shortcut={idx === 0 ? shortcuts.browseArtist : undefined}
              onAction={() => openCollection(artist)}
            />
          ))}
          <Action
            title="Copy Media URI"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(item.uri);
              await showToast({ style: Toast.Style.Success, title: "Copied Media URI" });
            }}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Workspace">
        <Action.Push
          title="Now Playing"
          icon={Icon.Music}
          shortcut={shortcuts.nowPlaying}
          target={
            <SessionRoute sessionBridge={bridge}>
              <NowPlayingView />
            </SessionRoute>
          }
        />
        <Action.Push
          title="Show Queue"
          icon={Icon.List}
          shortcut={shortcuts.queue}
          target={
            <SessionRoute sessionBridge={bridge}>
              <QueueView />
            </SessionRoute>
          }
        />
        <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={shortcuts.refresh} onAction={() => run(refresh)} />
        <KeyboardShortcutsAction />
        <Action
          title="Extension Preferences"
          icon={Icon.Gear}
          shortcut={shortcuts.preferences}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
