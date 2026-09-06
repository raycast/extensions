import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";
import type { Artist, Album, Item } from "../domain/model";
import { SessionRoute, useMusic } from "./session";
import { PlayerActions } from "./player-actions";
import { QueueView } from "./queue-view";
import { shortcuts } from "./shortcuts";

export function ItemActions({ item, openCollection }: { item?: Item; openCollection: (item: Artist | Album) => void }) {
  const { controller, run, refresh } = useMusic();
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
            onAction={() => openCollection(item)}
          />
        )}
      </ActionPanel.Section>
      <PlayerActions highlighted={item?.kind === "player" ? item : undefined} />
      <ActionPanel.Section title="Workspace">
        <Action.Push
          title="Show Queue"
          icon={Icon.List}
          shortcut={shortcuts.queue}
          target={
            <SessionRoute>
              <QueueView />
            </SessionRoute>
          }
        />
        <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={shortcuts.refresh} onAction={() => run(refresh)} />
        <Action title="Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
