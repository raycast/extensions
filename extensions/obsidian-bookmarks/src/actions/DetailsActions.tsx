import {
  Action,
  Alert,
  Color,
  confirmAlert,
  FileIcon,
  Icon,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Dispatch, SetStateAction, useCallback, useMemo } from "react";
import { ApplicationsProvider, useFileIcon } from "../hooks/use-applications";
import { PreferencesProvider, usePreference } from "../hooks/use-preferences";
import { DetailActionPreference, File } from "../types";
import LinkForm from "../views/LinkForm";
import * as methods from "./methods";
import { ActionGroup, OrderedActionPanel } from "./order-manager";
import { clearCache } from "../helpers/clear-cache";
import { addToFavorites, isFavorite, moveFavorite, removeFromFavorites } from "../helpers/favorites";
import readBookmarkBody from "../helpers/read-bookmark-body";

const createDetailsActions = (
  file: File,
  showDetail: boolean,
  setShowDetail: Dispatch<SetStateAction<boolean>>,
  editBookmark: () => void
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
    [
      "editBookmark",
      {
        title: "Edit Bookmark",
        icon: Icon.Pencil,
        shortcut: { modifiers: ["cmd"], key: "e" },
        onAction: editBookmark,
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
      "openUrlInCurrentWindow",
      {
        title: "Open Link in Current Window",
        icon: Icon.AppWindow,
        shortcut: { modifiers: ["cmd", "opt"], key: "o" },
        onAction: () => Promise.allSettled([methods.openUrlInCurrentWindow(file), showHUD("Opening link…")]),
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

const createFavoriteActions = (
  file: File,
  files: File[],
  applyFavorites: (changed: File[]) => void
): ActionGroup<DetailActionPreference> => {
  const actions = new Map<DetailActionPreference, Action.Props>([
    [
      "toggleFavorite",
      {
        title: isFavorite(file) ? "Remove from Favorites" : "Add to Favorites",
        icon: isFavorite(file) ? Icon.StarDisabled : Icon.Star,
        shortcut: { modifiers: ["cmd", "shift"], key: "f" },
        onAction: () =>
          applyFavorites(isFavorite(file) ? removeFromFavorites(files, file) : addToFavorites(files, file)),
      },
    ],
  ]);

  if (isFavorite(file)) {
    actions.set("moveFavoriteUp", {
      title: "Move Favorite Up",
      icon: Icon.ArrowUp,
      shortcut: { modifiers: ["opt", "shift"], key: "arrowUp" },
      onAction: () => applyFavorites(moveFavorite(files, file, -1)),
    });
    actions.set("moveFavoriteDown", {
      title: "Move Favorite Down",
      icon: Icon.ArrowDown,
      shortcut: { modifiers: ["opt", "shift"], key: "arrowDown" },
      onAction: () => applyFavorites(moveFavorite(files, file, 1)),
    });
  }

  return { key: "favorites", useDivider: "unless-first", title: "Favorites", actions };
};

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
  files: File[];
  showDetail: boolean;
  setShowDetail: Dispatch<SetStateAction<boolean>>;
  onFileUpdated?: (file: File) => void;
};
export default function DetailsActions({
  file,
  files,
  showDetail,
  setShowDetail,
  onFileUpdated,
}: DetailsActionsProps): React.JSX.Element {
  const { value: obsidianFileIcon } = useFileIcon("Obsidian");
  const { value: defaultAction } = usePreference("defaultItemAction");
  const { push } = useNavigation();

  const applyFavorites = useCallback(
    async (changed: File[]) => {
      const saved = await methods.saveFavorites(changed);
      saved.forEach((updated) => {
        onFileUpdated?.(updated);
      });
    },
    [onFileUpdated]
  );

  const editBookmark = useCallback(async () => {
    let body: string;
    try {
      body = await readBookmarkBody(file.fullPath);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't read this bookmark",
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    push(
      <ApplicationsProvider>
        <PreferencesProvider>
          <LinkForm file={{ ...file, body }} onSaved={onFileUpdated} />
        </PreferencesProvider>
      </ApplicationsProvider>
    );
  }, [push, file, onFileUpdated]);

  const groups = useMemo(() => {
    return [
      createDetailsActions(file, showDetail, setShowDetail, editBookmark),
      createBrowserActions(file),
      createFavoriteActions(file, files, applyFavorites),
      createObsidianActions(file, obsidianFileIcon),
      createDestructiveActions(file),
    ];
  }, [file, files, obsidianFileIcon, showDetail, setShowDetail, editBookmark, applyFavorites]);

  return <OrderedActionPanel groups={groups} defaultAction={defaultAction} />;
}
