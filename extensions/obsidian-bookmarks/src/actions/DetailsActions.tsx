import { Action, Alert, Color, confirmAlert, FileIcon, Icon, showHUD } from "@raycast/api";
import { Dispatch, SetStateAction, useMemo } from "react";
import { useFileIcon } from "../hooks/use-applications";
import { usePreference } from "../hooks/use-preferences";
import { DetailActionPreference, File } from "../types";
import * as methods from "./methods";
import { ActionGroup, OrderedActionPanel } from "./order-manager";
import { clearCache } from "../helpers/clear-cache";

const createDetailsActions = (
  file: File,
  showDetail: boolean,
  setShowDetail: Dispatch<SetStateAction<boolean>>
): ActionGroup<DetailActionPreference> => ({
  key: "details",
  useDivider: "unless-first",
  actions: new Map<DetailActionPreference, Action.Props>([
    [
      "showDetails",
      {
        title: showDetail ? "Hide Details" : "Show Details",
        icon: showDetail ? Icon.EyeSlash : Icon.Eye,
        shortcut: { modifiers: ["cmd"], key: "i" },
        onAction: () => setShowDetail((detail) => !detail),
      },
    ],
  ]),
});

const createObsidianActions = (file: File, icon?: FileIcon): ActionGroup<DetailActionPreference> => ({
  key: "obsidian",
  useDivider: "unless-first",
  title: "Obsidian",
  icon,
  actions: new Map<DetailActionPreference, Action.Props>([
    [
      "openObsidian",
      {
        title: "Open Obsidian",
        shortcut: { modifiers: ["cmd", "shift"], key: "o" },
        onAction: () => Promise.allSettled([methods.openObsidianFile(file), showHUD("Opening Obsidian…")]),
      },
    ],
    [
      "copyObsidianUrl",
      {
        title: "Copy Obsidian Link",
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
        onAction: async () => {
          await methods.copyObsidianUri(file);
          showHUD("Link copied");
        },
      },
    ],
    [
      "copyObsidianUrlAsMarkdown",
      {
        title: "Copy Obsidian Link as Markdown",
        shortcut: { modifiers: ["cmd", "shift"], key: "l" },
        onAction: async () => {
          await methods.copyObsidianUriAsMarkdown(file);
          showHUD("Link copied");
        },
      },
    ],
  ]),
});

const createBrowserActions = (file: File): ActionGroup<DetailActionPreference> => ({
  key: "browser",
  useDivider: "unless-first",
  title: "Browser Actions",
  actions: new Map<DetailActionPreference, Action.Props>([
    [
      "openUrl",
      {
        title: "Open Link",
        icon: Icon.Globe,
        shortcut: { modifiers: ["cmd", "ctrl"], key: "o" },
        onAction: () => Promise.allSettled([methods.openUrl(file), showHUD("Opening link…")]),
      },
    ],
    [
      "copyUrl",
      {
        title: "Copy Link",
        icon: Icon.Link,
        shortcut: { modifiers: ["cmd", "ctrl"], key: "c" },
        onAction: async () => {
          await methods.copyUrl(file);
          showHUD("Link copied");
        },
      },
    ],
    [
      "copyUrlAsMarkdown",
      {
        title: "Copy Link as Markdown",
        icon: Icon.Link,
        shortcut: { modifiers: ["cmd", "ctrl"], key: "l" },
        onAction: async () => {
          await methods.copyUrlAsMarkdown(file);
          showHUD("Link copied");
        },
      },
    ],
  ]),
});

const createDestructiveActions = (file: File): ActionGroup<DetailActionPreference> => ({
  key: "destructive",
  useDivider: "always",
  actions: new Map([
    [
      "markAsRead",
      {
        title: file.attributes.read ? "Mark as Unread" : "Mark as Read",
        icon: file.attributes.read ? Icon.Circle : Icon.Checkmark,
        shortcut: { modifiers: ["cmd", "shift"], key: "x" },
        onAction: () => (file.attributes.read ? methods.markAsUnread(file) : methods.markAsRead(file)),
      },
    ],
    [
      "deleteFile",
      {
        title: "Delete Bookmark",
        icon: { source: Icon.Trash, tintColor: Color.Red },
        shortcut: { modifiers: ["cmd", "shift"], key: "delete" },
        onAction: async () => {
          const confirm = await confirmAlert({
            icon: { source: Icon.Trash, tintColor: Color.Red },
            title: "Are you sure?",
            message: `Really delete ${file.attributes.title}?\nThis action cannot be undone.`,
            dismissAction: {
              title: "Nevermind",
            },
            primaryAction: {
              title: "Delete",
              style: Alert.ActionStyle.Destructive,
            },
          });
          if (confirm) {
            methods.deleteFile(file);
          }
        },
      },
    ],
    [
      "clearCache",
      {
        title: "Clear Cache",
        icon: { source: Icon.Trash, tintColor: Color.Red },
        shortcut: { modifiers: ["cmd", "opt"], key: "delete" },
        onAction: clearCache,
      },
    ],
  ]),
});

export type DetailsActionsProps = {
  file: File;
  showDetail: boolean;
  setShowDetail: Dispatch<SetStateAction<boolean>>;
};
export default function DetailsActions({ file, showDetail, setShowDetail }: DetailsActionsProps): JSX.Element {
  const { value: obsidianFileIcon } = useFileIcon("Obsidian");
  const { value: defaultAction } = usePreference("defaultItemAction");

  const groups = useMemo(() => {
    return [
      createDetailsActions(file, showDetail, setShowDetail),
      createBrowserActions(file),
      createObsidianActions(file, obsidianFileIcon),
      createDestructiveActions(file),
    ];
  }, [file, obsidianFileIcon, showDetail, setShowDetail, obsidianFileIcon]);

  return <OrderedActionPanel groups={groups} defaultAction={defaultAction} />;
}
