import { Action, ActionPanel, Grid, Toast, Icon, Color, showToast, Cache } from "@raycast/api";
import React from "react";
import { Icon8, IconProps, PinnedMovement } from "../types/types";
import { gridSize, numRecent } from "./utils";

const cache = new Cache();

export const IconStorageActions = (args: { props: IconProps; showMovement?: boolean }) => {
  const props = args.props;

  return (
    <ActionPanel.Section>
      {props.pinned && props.movement && args.showMovement && (
        <React.Fragment>
          {(props.movement.left || props.movement.up) && (
            <Action
              title={`Move ${props.movement.left ? "Left" : "Up"} in Pinned`}
              shortcut={{ modifiers: ["cmd", "opt"], key: `arrow${props.movement.left ? "Left" : "Up"}` }}
              icon={props.movement.left ? Icon.ArrowLeft : Icon.ArrowUp}
              onAction={() => {
                moveUpPinnedIcon(props.icon.id);
                props.refresh();
              }}
            />
          )}
          {(props.movement.right || props.movement.down) && (
            <Action
              title={`Move ${props.movement.right ? "Right" : "Down"} in Pinned`}
              shortcut={{ modifiers: ["cmd", "opt"], key: `arrow${props.movement.right ? "Right" : "Down"}` }}
              icon={props.movement.right ? Icon.ArrowRight : Icon.ArrowDown}
              onAction={() => {
                moveDownPinnedIcon(props.icon.id);
                props.refresh();
              }}
            />
          )}
        </React.Fragment>
      )}
      {props.pinned ? (
        <React.Fragment>
          <Action
            title="Remove Pinned Icon"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            icon={Icon.PinDisabled}
            onAction={() => {
              removePinnedIcon(props.icon.id);
              props.refresh();
              showToast(Toast.Style.Success, "Removed Pinned Icon");
            }}
          />
          <Action
            title="Clear All Pinned Icons"
            icon={{ source: Icon.XMarkCircleFilled, tintColor: Color.Red }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => {
              clearPinnedIcons(props.platform);
              props.refresh();
              showToast(Toast.Style.Success, "Pinned Icons Cleared");
            }}
          />
        </React.Fragment>
      ) : (
        <Action
          title="Pin Icon"
          icon={Icon.Pin}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={() => {
            appendPinnedIcon(props.icon);
            props.refresh();
            showToast(Toast.Style.Success, "Icon Pinned");
          }}
        />
      )}
      {props.recent && (
        <React.Fragment>
          <Action
            title="Remove Recent Icon"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => {
              removeRecentIcon(props.icon.id);
              props.refresh();
              showToast(Toast.Style.Success, "Removed Recent Icon");
            }}
          />
          <Action
            title="Clear All Recent Icons"
            icon={{ source: Icon.XMarkCircleFilled, tintColor: Color.Red }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => {
              clearRecentIcons(props.platform);
              props.refresh();
              showToast(Toast.Style.Success, "Recent Icons Cleared");
            }}
          />
        </React.Fragment>
      )}
    </ActionPanel.Section>
  );
};

const getStoredIcons = (key: string) => {
  const json: string | undefined = cache.get(key);
  if (!json) return [];
  return JSON.parse(json);
};

export const getRecentIcons = (platform?: string): Icon8[] => {
  const recent = getStoredIcons("recent");
  return recent.filter((icon: Icon8) => !platform || icon.platform === platform).slice(0, numRecent);
};

export const getPinnedIcons = (platform?: string): Icon8[] => {
  const pinned = getStoredIcons("pinned");
  return pinned.filter((icon: Icon8) => !platform || icon.platform === platform);
};

const remove = (icons: Icon8[], id: string | undefined): Icon8[] => {
  return icons.filter((i) => i.id !== id);
};

const appendStoredIcons = (key: string, icon: Icon8) => {
  let icons = getStoredIcons(key);
  icons = remove(icons, icon.id);
  icons.unshift(icon);
  if (icons.length > 1000) icons.pop();
  cache.set(key, JSON.stringify(icons));
};

export const appendRecentIcon = (icon: Icon8) => {
  const pinned = getPinnedIcons();
  if (pinned.some((i) => i.id === icon.id)) return;
  appendStoredIcons("recent", icon);
};

const appendPinnedIcon = (icon: Icon8) => {
  removeRecentIcon(icon.id);
  appendStoredIcons("pinned", icon);
};

const removeIcon = (key: string, id: string | undefined) => {
  let icons = getStoredIcons(key);
  icons = remove(icons, id);
  cache.set(key, JSON.stringify(icons));
};

export const removeRecentIcon = (id: string | undefined) => {
  removeIcon("recent", id);
};

export const removePinnedIcon = (id: string | undefined) => {
  removeIcon("pinned", id);
};

const clearRecentIcons = (platform?: string) => {
  if (platform) {
    const recent = getRecentIcons();
    const filtered = recent.filter((i) => i.platform !== platform);
    cache.set("recent", JSON.stringify(filtered));
  } else {
    cache.remove("recent");
  }
};

const clearPinnedIcons = (platform?: string) => {
  if (platform) {
    const pinned = getPinnedIcons();
    const filtered = pinned.filter((i) => i.platform !== platform);
    cache.set("pinned", JSON.stringify(filtered));
  } else {
    cache.remove("pinned");
  }
};

export const getPinnedMovement = (icons: Icon8[], id: string): PinnedMovement => {
  const index = icons.findIndex((icon: Icon8) => icon.id === id);
  const itemsPerRow = gridSize === Grid.ItemSize.Small ? 8 : 5;
  const up = index >= itemsPerRow && index % itemsPerRow === 0;
  const down = index < Math.floor(icons.length / itemsPerRow) * itemsPerRow && (index + 1) % itemsPerRow === 0;
  const right = !down && index !== icons.length - 1;
  const left = !up && index !== 0;
  return {
    up,
    right,
    down,
    left,
  };
};

const moveUpPinnedIcon = (id: string | undefined) => {
  const pinned = getPinnedIcons();
  const index = pinned.findIndex((i) => i.id === id);
  pinned.splice(index - 1, 2, pinned[index], pinned[index - 1]);
  cache.set("pinned", JSON.stringify(pinned));
};

const moveDownPinnedIcon = (id: string | undefined) => {
  const pinned = getPinnedIcons();
  const index = pinned.findIndex((i) => i.id === id);
  pinned.splice(index, 2, pinned[index + 1], pinned[index]);
  cache.set("pinned", JSON.stringify(pinned));
};
