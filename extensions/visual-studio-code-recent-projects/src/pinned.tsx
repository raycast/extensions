import { Action, ActionPanel, Toast, showToast, Icon, Color, Cache } from "@raycast/api";
import { isDeepStrictEqual } from "util";
import { EntryLike } from "./types";
import { layout } from "./preferences";

interface PinnedMovement {
  up?: boolean;
  right?: boolean;
  down?: boolean;
  left?: boolean;
}

interface PinnedActionsProps {
  pinned?: boolean;
  entry: EntryLike;
  movement: PinnedMovement;
  type?: (entry: EntryLike) => entry is EntryLike;
  refresh: () => void;
}

export const PinnedActions = (props: PinnedActionsProps) => {
  return !props.pinned ? (
    <ActionPanel.Section>
      <Action
        title="Pin Entry"
        icon={Icon.Pin}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={async () => {
          addPinnedEntry(props.entry);
          props.refresh();
          await showToast(Toast.Style.Success, "Entry Pinned");
        }}
      />
    </ActionPanel.Section>
  ) : (
    <ActionPanel.Section>
      {(props.movement.left || props.movement.up) && (
        <Action
          title={`Move ${props.movement.left ? "Left" : "Up"} in Pinned`}
          shortcut={{ modifiers: ["cmd", "opt"], key: `arrow${props.movement.left ? "Left" : "Up"}` }}
          icon={props.movement.left ? Icon.ArrowLeft : Icon.ArrowUp}
          onAction={async () => {
            moveUpPinnedEntry(props.entry);
            props.refresh();
          }}
        />
      )}
      {(props.movement.right || props.movement.down) && (
        <Action
          title={`Move ${props.movement.right ? "Right" : "Down"} in Pinned`}
          shortcut={{ modifiers: ["cmd", "opt"], key: `arrow${props.movement.right ? "Right" : "Down"}` }}
          icon={props.movement.right ? Icon.ArrowRight : Icon.ArrowDown}
          onAction={async () => {
            moveDownPinnedEntry(props.entry);
            props.refresh();
          }}
        />
      )}
      <Action
        title="Remove Pinned Entry"
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        icon={Icon.PinDisabled}
        onAction={async () => {
          removePinnedEntry(props.entry);
          props.refresh();
          await showToast(Toast.Style.Success, "Removed Pinned Entry");
        }}
      />
      <Action
        title="Clear All Pinned Entries"
        icon={{ source: Icon.XMarkCircleFilled, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={async () => {
          clearPinnedEntries(props.type);
          props.refresh();
          await showToast(Toast.Style.Success, "Pinned Entries Cleared");
        }}
      />
    </ActionPanel.Section>
  );
};

const pinned = new Cache();

export const getPinnedEntries = (): EntryLike[] => {
  const json: string | undefined = pinned.get("pinned");
  if (!json) return [];
  return JSON.parse(json);
};

const remove = (entries: EntryLike[], entry: EntryLike): EntryLike[] => {
  return entries.filter((e) => !isDeepStrictEqual(e, entry));
};

const addPinnedEntry = (entry: EntryLike): void => {
  const pinnedEntries = remove(getPinnedEntries(), entry);
  pinnedEntries.unshift(entry);
  pinned.set("pinned", JSON.stringify(pinnedEntries));
};

export const removePinnedEntry = (entry: EntryLike): void => {
  const pinnedEntries = getPinnedEntries();
  pinned.set("pinned", JSON.stringify(remove(pinnedEntries, entry)));
};

const clearPinnedEntries = (type?: (entry: EntryLike) => entry is EntryLike): void => {
  if (type) {
    const pinnedEntries = getPinnedEntries();
    const filtered = pinnedEntries.filter((entry) => !type(entry));
    pinned.set("pinned", JSON.stringify(filtered));
  } else {
    pinned.remove("pinned");
  }
};

export const getPinnedMovement = (entries: EntryLike[], entry: EntryLike): PinnedMovement => {
  if (layout === "grid") {
    const index = entries.findIndex((e: EntryLike) => isDeepStrictEqual(e, entry));
    const up = index >= 8 && index % 8 === 0;
    const down = index < Math.floor(entries.length / 8) * 8 && (index + 1) % 8 === 0;
    const right = !down && index !== entries.length - 1;
    const left = !up && index !== 0;
    return {
      up,
      right,
      down,
      left,
    };
  } else {
    const index = entries.findIndex((e: EntryLike) => isDeepStrictEqual(e, entry));
    const up = index !== 0;
    const down = index !== entries.length - 1;
    return {
      up,
      down,
    };
  }
};

const moveUpPinnedEntry = (entry: EntryLike): void => {
  const pinnedEntries = getPinnedEntries();
  const i = pinnedEntries.findIndex((e) => isDeepStrictEqual(e, entry));
  pinnedEntries.splice(i - 1, 2, pinnedEntries[i], pinnedEntries[i - 1]);
  pinned.set("pinned", JSON.stringify(pinnedEntries));
};

const moveDownPinnedEntry = (entry: EntryLike): void => {
  const pinnedEntries = getPinnedEntries();
  const i = pinnedEntries.findIndex((e) => isDeepStrictEqual(e, entry));
  pinnedEntries.splice(i, 2, pinnedEntries[i + 1], pinnedEntries[i]);
  pinned.set("pinned", JSON.stringify(pinnedEntries));
};
