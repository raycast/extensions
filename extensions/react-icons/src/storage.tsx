import React from "react";
import { Action, ActionPanel, Toast, Icon, Color, showToast, Cache } from "@raycast/api";
import { IconProps, PinnedMovement } from "./types";

const cache = new Cache();

export const IconStorageActions = (props: IconProps) => {
  const { icon, category, pinned, recent, movement, refresh } = props;
  return (
    <ActionPanel.Section>
      {pinned && movement && (
        <React.Fragment>
          {(movement.left || movement.up) && (
            <Action
              title={`Move ${movement.left ? "Left" : "Up"} in Pinned`}
              shortcut={{ modifiers: ["cmd", "opt"], key: `arrow${movement.left ? "Left" : "Up"}` }}
              icon={movement.left ? Icon.ArrowLeft : Icon.ArrowUp}
              onAction={() => {
                moveUpPinnedIcon(icon, category.title);
                refresh();
              }}
            />
          )}
          {(movement.right || movement.down) && (
            <Action
              title={`Move ${movement.right ? "Right" : "Down"} in Pinned`}
              shortcut={{ modifiers: ["cmd", "opt"], key: `arrow${movement.right ? "Right" : "Down"}` }}
              icon={movement.right ? Icon.ArrowRight : Icon.ArrowDown}
              onAction={() => {
                moveDownPinnedIcon(icon, category.title);
                refresh();
              }}
            />
          )}
        </React.Fragment>
      )}
      {pinned ? (
        <React.Fragment>
          <Action
            title="Remove Pinned Icon"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            icon={Icon.PinDisabled}
            onAction={() => {
              removePinnedIcon(icon, category.title);
              refresh();
              showToast(Toast.Style.Success, "Removed Pinned Icon");
            }}
          />
          <Action
            title="Clear All Pinned Icons"
            icon={{ source: Icon.PinDisabled, tintColor: Color.Red }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => {
              clearPinnedIcons(category.title);
              refresh();
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
            addPinnedIcon(icon, category.title);
            refresh();
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
              removeRecentIcon(icon, category.title);
              refresh();
              showToast(Toast.Style.Success, "Removed Recent Icon");
            }}
          />
          <Action
            title="Clear All Recent Icons"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => {
              clearRecentIcons(category.title);
              refresh();
              showToast(Toast.Style.Success, "Recent Icons Cleared");
            }}
          />
        </React.Fragment>
      )}
    </ActionPanel.Section>
  );
};

export const getRecentIcons = (category?: string): string[] => {
  if (category) {
    const json: string | undefined = cache.get(`recent-${category}`);
    if (!json) return [];
    return JSON.parse(json);
  }
  return [];
};

export const getPinnedIcons = (category?: string): string[] => {
  if (category) {
    const json: string | undefined = cache.get(`pinned-${category}`);
    if (!json) return [];
    return JSON.parse(json);
  }
  return [];
};

const remove = (icons: string[], icon: string): string[] => {
  return icons.filter((i) => i !== icon);
};

export const addRecentIcon = (icon: string, category: string) => {
  let icons = getPinnedIcons(category);
  if (icons.includes(icon)) return;
  icons = getRecentIcons(category);
  icons = remove(icons, icon);
  icons.unshift(icon);
  if (icons.length > 1000) icons.pop();
  cache.set(`recent-${category}`, JSON.stringify(icons));
};

const addPinnedIcon = (icon: string, category: string) => {
  removeRecentIcon(icon, category);
  let icons = getPinnedIcons(category);
  icons = remove(icons, icon);
  icons.unshift(icon);
  if (icons.length > 1000) icons.pop();
  cache.set(`pinned-${category}`, JSON.stringify(icons));
};

const removeRecentIcon = (icon: string, category: string) => {
  let icons = getRecentIcons(category);
  icons = remove(icons, icon);
  cache.set(`recent-${category}`, JSON.stringify(icons));
};

const removePinnedIcon = (icon: string, category: string) => {
  let icons = getPinnedIcons(category);
  icons = remove(icons, icon);
  cache.set(`pinned-${category}`, JSON.stringify(icons));
};

const clearRecentIcons = (category: string) => {
  cache.remove(`recent-${category}`);
};

const clearPinnedIcons = (category: string) => {
  cache.remove(`pinned-${category}`);
};

export const getPinnedMovement = (icons: string[], icon: string): PinnedMovement => {
  const index = icons.findIndex((i: string) => i === icon);
  const up = index >= 8 && index % 8 === 0;
  const down = index < Math.floor(icons.length / 8) * 8 && (index + 1) % 8 === 0;
  const right = !down && index !== icons.length - 1;
  const left = !up && index !== 0;
  return {
    up,
    right,
    down,
    left,
  };
};

const moveUpPinnedIcon = (icon: string, category: string) => {
  const icons = getPinnedIcons(category);
  const index = icons.findIndex((i) => i === icon);
  icons.splice(index - 1, 2, icons[index], icons[index - 1]);
  cache.set(`pinned-${category}`, JSON.stringify(icons));
};

const moveDownPinnedIcon = (icon: string, category: string) => {
  const icons = getPinnedIcons(category);
  const index = icons.findIndex((i) => i === icon);
  icons.splice(index, 2, icons[index + 1], icons[index]);
  cache.set(`pinned-${category}`, JSON.stringify(icons));
};
