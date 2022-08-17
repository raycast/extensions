import { Action, ActionPanel, Toast, showToast, Icon, Color, LocalStorage } from "@raycast/api";
import React from "react";
import { Icon8, IconProps, PinnedMovement } from "../types/types";
import { gridSize, numRecent } from "./utils";

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
              onAction={async () => {
                await moveUpPinnedIcon(props.icon.id);
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
                await moveDownPinnedIcon(props.icon.id);
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
            onAction={async () => {
              removePinnedIcon(props.icon.id);
              props.refresh();
              showToast(Toast.Style.Success, "Removed Pinned Icon");
            }}
          />
          <Action
            title="Clear All Pinned Icons"
            icon={{ source: Icon.XMarkCircleFilled, tintColor: Color.Red }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={async () => {
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
          onAction={async () => {
            await appendPinnedIcon(props.icon);
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
            onAction={async () => {
              await removeRecentIcon(props.icon.id);
              props.refresh();
              showToast(Toast.Style.Success, "Removed Recent Icon");
            }}
          />
          <Action
            title="Clear All Recent Icons"
            icon={{ source: Icon.XMarkCircleFilled, tintColor: Color.Red }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={async () => {
              await clearRecentIcons(props.platform);
              props.refresh();
              showToast(Toast.Style.Success, "Recent Icons Cleared");
            }}
          />
        </React.Fragment>
      )}
    </ActionPanel.Section>
  );
};

const getStoredIcons = async (key: string) => {
  const json: string | undefined = await LocalStorage.getItem(key);
  if (!json) return [];
  return JSON.parse(json);
};

export const getRecentIcons = async (platform?: string): Promise<Icon8[]> => {
  const recent = await getStoredIcons("recent");
  return recent.filter((icon: Icon8) => !platform || icon.platform === platform).slice(0, numRecent);
};

export const getPinnedIcons = async (platform?: string): Promise<Icon8[]> => {
  const pinned = await getStoredIcons("pinned");
  return pinned.filter((icon: Icon8) => !platform || icon.platform === platform);
};

const remove = (icons: Icon8[], id: string | undefined): Icon8[] => {
  return icons.filter((i) => i.id !== id);
};

const appendStoredIcons = async (key: string, icon: Icon8) => {
  let icons = await getStoredIcons(key);
  icons = remove(icons, icon.id);
  icons.unshift(icon);
  if (icons.length > 1000) icons.pop();
  await LocalStorage.setItem(key, JSON.stringify(icons));
};

export const appendRecentIcon = async (icon: Icon8) => {
  const pinned = await getPinnedIcons();
  if (pinned.some((i) => i.id === icon.id)) return;
  await appendStoredIcons("recent", icon);
};

const appendPinnedIcon = async (icon: Icon8) => {
  await removeRecentIcon(icon.id);
  await appendStoredIcons("pinned", icon);
};

const removeIcon = async (key: string, id: string | undefined) => {
  let icons = await getStoredIcons(key);
  icons = remove(icons, id);
  await LocalStorage.setItem(key, JSON.stringify(icons));
};

export const removeRecentIcon = async (id: string | undefined) => {
  await removeIcon("recent", id);
};

export const removePinnedIcon = async (id: string | undefined) => {
  await removeIcon("pinned", id);
};

const clearRecentIcons = async (platform?: string) => {
  if (platform) {
    const recent = await getRecentIcons();
    const filtered = recent.filter((i) => i.platform !== platform);
    await LocalStorage.setItem("recent", JSON.stringify(filtered));
  } else {
    await LocalStorage.removeItem("recent");
  }
};

const clearPinnedIcons = async (platform?: string) => {
  if (platform) {
    const pinned = await getPinnedIcons();
    const filtered = pinned.filter((i) => i.platform !== platform);
    await LocalStorage.setItem("pinned", JSON.stringify(filtered));
  } else {
    await LocalStorage.removeItem("pinned");
  }
};

export const getPinnedMovement = (icons: Icon8[], id: string): PinnedMovement => {
  const index = icons.findIndex((icon: Icon8) => icon.id === id);
  const itemsPerRow = gridSize === "small" ? 8 : 5;
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

const moveUpPinnedIcon = async (id: string | undefined) => {
  const pinned = await getPinnedIcons();
  const index = pinned.findIndex((i) => i.id === id);
  pinned.splice(index - 1, 2, pinned[index], pinned[index - 1]);
  await LocalStorage.setItem("pinned", JSON.stringify(pinned));
};

const moveDownPinnedIcon = async (id: string | undefined) => {
  const pinned = await getPinnedIcons();
  const index = pinned.findIndex((i) => i.id === id);
  pinned.splice(index, 2, pinned[index + 1], pinned[index]);
  await LocalStorage.setItem("pinned", JSON.stringify(pinned));
};
