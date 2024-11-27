import { List, Action, ActionPanel, Icon, Color, Toast, showToast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { moduleitem } from "../utils/types";
import {
  appendRecentModuleItem,
  appendPinnedModuleItem,
  removeRecentModuleItem,
  removePinnedModuleItem,
  clearRecentModuleItems,
  clearPinnedModuleItems,
  isTopPinnedModuleItem,
  isBottomPinnedModuleItem,
  moveUpPinnedModuleItem,
  moveDownPinnedModuleItem,
} from "../utils/recent";
import { Icons, getIsCodeFile } from "../utils/utils";
import open from "open";

export const ModuleItem = (props: {
  id: number;
  url: string;
  item: moduleitem;
  refresh: () => void;
  pinned?: boolean;
  recent?: boolean;
}) => {
  const [isTopPinned, setIsTopPinned] = useState<boolean>(false);
  const [isBottomPinned, setIsBottomPinned] = useState<boolean>(false);

  if (props.pinned) {
    useEffect(() => {
      const getItemPosition = async () => {
        setIsTopPinned(await isTopPinnedModuleItem(props.id, props.item.id));
        setIsBottomPinned(await isBottomPinnedModuleItem(props.id, props.item.id));
      };
      getItemPosition();
    }, [props.refresh]);
  }

  return (
    <List.Item
      id={`${props.pinned ? "pin" : props.recent ? "recent" : ""}${props.item.id}`}
      title={props.item.name}
      icon={{
        source: getIsCodeFile(props.item.name)
          ? Icons["Code"]
          : props.item.passcode
          ? Icons["Passcode"]
          : props.item.type in Icons
          ? Icons[props.item.type]
          : Icon.ExclamationMark,
      }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={props.item.url}
            icon={{ source: Icon.Link }}
            onOpen={async () => {
              await appendRecentModuleItem(props.id, props.item);
              props.refresh();
            }}
          />
          {props.item.download && (
            <Action
              title="Download File"
              onAction={async () => {
                await open(props.item.download, { background: true });
                await appendRecentModuleItem(props.id, props.item);
                props.refresh();
              }}
              icon={{ source: Icon.Download }}
            />
          )}
          {props.item.passcode && (
            <ActionPanel.Section title="Passcode">
              <Action.CopyToClipboard
                title="Copy Passcode"
                content={props.item.passcode}
                onCopy={async () => {
                  await appendRecentModuleItem(props.id, props.item);
                  props.refresh();
                }}
              />
              <Action.Paste
                title="Paste Passcode"
                content={props.item.passcode}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
                onPaste={async () => {
                  await appendRecentModuleItem(props.id, props.item);
                  props.refresh();
                }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            {props.pinned ? (
              <React.Fragment>
                {!isTopPinned && (
                  <Action
                    title="Move Up in Pinned"
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                    icon={{ source: Icon.ArrowUp }}
                    onAction={async () => {
                      await moveUpPinnedModuleItem(props.id, props.item.id);
                      props.refresh();
                    }}
                  />
                )}
                {!isBottomPinned && (
                  <Action
                    title="Move Down in Pinned"
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                    icon={{ source: Icon.ArrowDown }}
                    onAction={async () => {
                      await moveDownPinnedModuleItem(props.id, props.item.id);
                      props.refresh();
                    }}
                  />
                )}
                <Action
                  title="Remove Pinned Item"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  icon={{ source: Icon.PinDisabled }}
                  onAction={async () => {
                    removePinnedModuleItem(props.id, props.item.id);
                    props.refresh();
                    showToast(Toast.Style.Success, `Removed Pinned Item`);
                  }}
                />
                <Action
                  title="Clear Pinned Items"
                  icon={{ source: Icon.XMarkCircleFilled, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={async () => {
                    clearPinnedModuleItems(props.id);
                    props.refresh();
                    showToast(Toast.Style.Success, "Pinned Items Cleared");
                  }}
                />
              </React.Fragment>
            ) : (
              <Action
                title="Pin Item"
                icon={{ source: Icon.Pin }}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
                onAction={async () => {
                  await appendPinnedModuleItem(props.id, props.item);
                  props.refresh();
                  showToast(Toast.Style.Success, "Item Pinned");
                }}
              />
            )}
            {props.recent && (
              <React.Fragment>
                <Action
                  title="Remove Recent Item"
                  onAction={async () => {
                    await removeRecentModuleItem(props.id, props.item.id);
                    props.refresh();
                    showToast(Toast.Style.Success, "Recent Item Removed");
                  }}
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Clear Recent Items"
                  onAction={async () => {
                    await clearRecentModuleItems(props.id);
                    props.refresh();
                    showToast(Toast.Style.Success, "Recent Items Cleared");
                  }}
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
              </React.Fragment>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Home Page"
              icon={{ source: Icons["Home"], tintColor: Color.PrimaryText }}
              url={props.url}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
