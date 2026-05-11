import React from "react";
import {
  Action,
  ActionPanel,
  Icon,
  showToast,
  Toast,
  showInFinder,
  open,
  closeMainWindow,
  Clipboard,
} from "@raycast/api";
import path from "path";

import { getDefaultAction } from "../preferences";

import { GifDetails } from "./GifDetails";
import { IGif } from "../models/gif";

import copyFileToClipboard from "../lib/copyFileToClipboard";
import stripQParams from "../lib/stripQParams";
import downloadFile from "../lib/downloadFile";
import { removeGifFromCache } from "../lib/cachedGifs";
import { getAllFavIds, getAllRecentIds, remove, save } from "../lib/localGifs";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getServiceFromUrl } from "../lib/getServiceFromUrl";

interface GifActionsProps {
  item: IGif;
  showViewDetails: boolean;
  visitGifItem?: (gif: IGif) => void;
  mutate: () => Promise<void>;
}

export function GifActions({ item, showViewDetails, visitGifItem, mutate }: GifActionsProps) {
  const { id, url, gif_url } = item;

  const service = getServiceFromUrl(item);

  const { data: favIds } = useCachedPromise(getAllFavIds);
  const { data: recentIds } = useCachedPromise(getAllRecentIds);

  const isInFavorites = favIds?.includes(id);
  const isInRecents = recentIds?.includes(id);

  const trackUsage = async () => {
    if (service) {
      await save(item, service, "recent");
      await mutate();
      await visitGifItem?.(item);
    }
  };

  const removeFromRecents = async () => {
    try {
      if (service) {
        await remove(item, service, "recent");
        await mutate();
        await showToast({ style: Toast.Style.Success, title: "Removed GIF from recents" });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Could not remove GIF from recents" });
    }
  };

  const addToFav = async () => {
    try {
      if (service) {
        await save(item, service, "favs");
        await mutate();
        await showToast({ style: Toast.Style.Success, title: "Added GIF to favorites" });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Could not add GIF to favorites" });
    }
  };

  const removeFav = async () => {
    try {
      if (service) {
        await remove(item, service, "favs");
        await mutate();
        await showToast({ style: Toast.Style.Success, title: "Removed GIF from favorites" });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Could not remove GIF from favorites" });
    }

    // Remove the GIF from the cache if it exists
    try {
      const fileName = item.download_name || path.basename(item.download_url);
      await removeGifFromCache(fileName);
    } catch (error) {
      console.error("Failed to remove GIF from cache:", error);
    }
  };

  async function copyGif() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Copying GIF" });
      const isInFavorites = favIds?.includes(id);
      const file = await copyFileToClipboard(item.download_url, item.download_name, isInFavorites);
      await trackUsage();
      await closeMainWindow();
      await showToast({ style: Toast.Style.Success, title: `Copied GIF "${path.basename(file)}" to clipboard` });
    } catch (error) {
      await showFailureToast(error, { title: "Could not copy GIF" });
    }
  }

  async function pasteGif() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Pasting GIF" });
      const isInFavorites = favIds?.includes(id);
      const file = await copyFileToClipboard(item.download_url, item.download_name, isInFavorites);
      await trackUsage();
      await closeMainWindow();
      await Clipboard.paste({ file });
      await showToast({ style: Toast.Style.Success, title: `Pasted GIF "${path.basename(file)}"` });
    } catch (error) {
      console.error(error);
      await showFailureToast(error, { title: "Could not paste GIF" });
    }
  }

  const downloadGIFAction = async () => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Downloading GIF", message: item.download_name });
      const filePath = await downloadFile(item.download_url, item.download_name);

      if (typeof filePath === "string") {
        await showToast({
          style: Toast.Style.Success,
          title: "Downloaded GIF",
          message: filePath,
          primaryAction: {
            title: "Open File",
            shortcut: { macOS: { modifiers: ["cmd"], key: "o" }, Windows: { modifiers: ["ctrl"], key: "o" } },
            onAction() {
              open(filePath);
            },
          },
          secondaryAction: {
            title: "Show GIF in Finder",
            shortcut: {
              macOS: { modifiers: ["cmd", "shift"], key: "o" },
              Windows: { modifiers: ["ctrl", "shift"], key: "o" },
            },
            onAction() {
              showInFinder(filePath);
            },
          },
        });
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not download GIF",
        message: item.download_name,
      });
    }
  };

  const copyFile = (
    <Action
      icon={Icon.Clipboard}
      key="copyFile"
      title="Copy GIF"
      onAction={copyGif}
      shortcut={{ macOS: { modifiers: ["cmd", "opt"], key: "c" }, Windows: { modifiers: ["ctrl", "opt"], key: "c" } }}
    />
  );
  const pasteFile = (
    <Action
      icon={Icon.Clipboard}
      key="pasteFile"
      title="Paste GIF"
      onAction={pasteGif}
      shortcut={{ macOS: { modifiers: ["cmd", "opt"], key: "p" }, Windows: { modifiers: ["ctrl", "opt"], key: "p" } }}
    />
  );
  const copyGifUrl = (
    <Action.CopyToClipboard
      key="copyGifUrl"
      title="Copy GIF Link"
      content={stripQParams(gif_url)}
      onCopy={trackUsage}
    />
  );
  const copyGifMarkdown = (
    <Action.CopyToClipboard
      key="copyGifMarkdown"
      title="Copy GIF Markdown"
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "enter" },
        Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
      }}
      content={`![${item.title}](${stripQParams(gif_url)})`}
      onCopy={trackUsage}
    />
  );
  const pasteGifMarkdown = (
    <Action.Paste
      key="pasteGifMarkdown"
      title="Paste GIF Markdown"
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "p" },
        Windows: { modifiers: ["ctrl", "shift"], key: "p" },
      }}
      content={`![${item.title}](${stripQParams(gif_url)})`}
      onPaste={trackUsage}
    />
  );
  const pasteGifUrl = (
    <Action.Paste
      key="pasteGifUrl"
      title="Paste GIF Link"
      shortcut={{ macOS: { modifiers: ["cmd", "opt"], key: "l" }, Windows: { modifiers: ["ctrl", "opt"], key: "l" } }}
      content={stripQParams(gif_url)}
      onPaste={trackUsage}
    />
  );

  let toggleFav: React.JSX.Element | undefined;
  if (favIds) {
    toggleFav = isInFavorites ? (
      <Action
        icon={Icon.Star}
        key="toggleFav"
        title="Remove from Favorites"
        onAction={removeFav}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "f" },
          Windows: { modifiers: ["ctrl", "shift"], key: "f" },
        }}
      />
    ) : (
      <Action
        icon={Icon.Star}
        key="toggleFav"
        title="Add to Favorites"
        onAction={addToFav}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "f" },
          Windows: { modifiers: ["ctrl", "shift"], key: "f" },
        }}
      />
    );
  }

  const removeRecent = isInRecents ? (
    <Action
      icon={Icon.Clock}
      key="removeRecent"
      title="Remove from Recents"
      onAction={removeFromRecents}
      shortcut={{
        macOS: { modifiers: ["ctrl", "shift"], key: "r" },
        Windows: { modifiers: ["ctrl", "shift"], key: "r" },
      }}
    />
  ) : undefined;

  const viewDetails = (
    <Action.Push
      icon={Icon.Eye}
      key="viewDetails"
      title="View GIF Details"
      target={<GifDetails item={item} mutate={mutate} />}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "d" },
        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
      }}
      onPush={trackUsage}
    />
  );

  const copyPageUrl = url ? (
    <Action.CopyToClipboard
      key="copyPageUrl"
      title="Copy Page Link"
      content={url}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "c" },
        Windows: { modifiers: ["ctrl", "shift"], key: "c" },
      }}
      onCopy={trackUsage}
    />
  ) : undefined;
  const openUrlInBrowser = url ? (
    <Action.OpenInBrowser
      key="openUrlInBrowser"
      url={url}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "b" },
        Windows: { modifiers: ["ctrl", "shift"], key: "b" },
      }}
      onOpen={trackUsage}
    />
  ) : undefined;
  const downloadFileAction = (
    <Action
      key="downloadFile"
      shortcut={{ macOS: { modifiers: ["cmd", "opt"], key: "d" }, Windows: { modifiers: ["ctrl", "opt"], key: "d" } }}
      icon={Icon.Download}
      title="Download GIF"
      onAction={downloadGIFAction}
    />
  );

  const actions: Array<(React.JSX.Element | undefined)[]> = [
    [copyFile, pasteFile, copyGifUrl, pasteGifUrl, copyGifMarkdown, pasteGifMarkdown],
    [toggleFav, removeRecent, showViewDetails ? viewDetails : undefined],
    [copyPageUrl, openUrlInBrowser, downloadFileAction],
  ];

  const defaultAction = actions[0]?.[0];
  const defaultActionPref = getDefaultAction();
  for (let sectionIndex = 0; sectionIndex < actions.length; sectionIndex++) {
    const section = actions[sectionIndex];

    for (let index = 0; index < section.length; index++) {
      const action = section[index];

      if (action?.key !== defaultAction?.key && action?.key == defaultActionPref) {
        // Remove the action from its current location
        section.splice(index, 1);

        if (sectionIndex === 0) {
          // If the new default is already in the first section, just make it the first element
          section.unshift(action);
        } else {
          // Otherwise move matching action to its own new first section
          actions.unshift([action]);
        }
      }
    }
  }

  return (
    <ActionPanel title={item.title}>
      {actions.map((section, index) => (
        <ActionPanel.Section key={index}>{section}</ActionPanel.Section>
      ))}
    </ActionPanel>
  );
}
