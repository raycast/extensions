import { Action, ActionPanel, Icon, showToast, Toast, showInFinder, open, closeMainWindow } from "@raycast/api";
import path from "path";

import { getDefaultAction, ServiceName } from "../preferences";

import { GifDetails } from "./GifDetails";
import { IGif } from "../models/gif";

import copyFileToClipboard from "../lib/copyFileToClipboard";
import stripQParams from "../lib/stripQParams";
import downloadFile from "../lib/downloadFile";
import { removeGifFromCache } from "../lib/cachedGifs";
import { get, remove, save } from "../lib/localGifs";
import { showFailureToast, useCachedPromise } from "@raycast/utils";

interface GifActionsProps {
  item: IGif;
  showViewDetails: boolean;
  service?: ServiceName;
  visitGifItem?: (gif: IGif) => void;
  mutate: () => Promise<void>;
}

export function GifActions({ item, showViewDetails, service, visitGifItem, mutate }: GifActionsProps) {
  const { id, url, gif_url } = item;

  const { data: favIds } = useCachedPromise((s) => get(s, "favs"), [service]);
  const { data: recentIds } = useCachedPromise((s) => get(s, "recent"), [service]);

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
      const isInFavorites = favIds?.includes(id.toString());
      const file = await copyFileToClipboard(item.download_url, item.download_name, isInFavorites);
      await trackUsage();
      await closeMainWindow();
      await showToast({ style: Toast.Style.Success, title: `Copied GIF "${file}" to clipboard` });
    } catch (error) {
      await showFailureToast(error, { title: "Could not copy GIF" });
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
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction() {
              open(filePath);
            },
          },
          secondaryAction: {
            title: "Show GIF in Finder",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction() {
              showInFinder(filePath);
            },
          },
        });
      }
    } catch (error) {
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
      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
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
      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      content={`![${item.title}](${stripQParams(gif_url)})`}
      onCopy={trackUsage}
    />
  );

  let toggleFav: JSX.Element | undefined;
  const isFav = favIds?.includes(id.toString());
  if (favIds) {
    toggleFav = isFav ? (
      <Action
        icon={Icon.Star}
        key="toggleFav"
        title="Remove From Favorites"
        onAction={removeFav}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
    ) : (
      <Action
        icon={Icon.Star}
        key="toggleFav"
        title="Add to Favorites"
        onAction={addToFav}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
    );
  }

  const isRecent = recentIds?.includes(id.toString());
  const removeRecent = isRecent ? (
    <Action
      icon={Icon.Clock}
      key="removeRecent"
      title="Remove From Recents"
      onAction={removeFromRecents}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
    />
  ) : undefined;

  const viewDetails = (
    <Action.Push
      icon={Icon.Eye}
      key="viewDetails"
      title="View GIF Details"
      target={<GifDetails item={item} service={service} mutate={mutate} />}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      onPush={trackUsage}
    />
  );

  const copyPageUrl = url ? (
    <Action.CopyToClipboard
      key="copyPageUrl"
      title="Copy Page Link"
      content={url}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      onCopy={trackUsage}
    />
  ) : undefined;
  const openUrlInBrowser = url ? (
    <Action.OpenInBrowser
      key="openUrlInBrowser"
      url={url}
      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
      onOpen={trackUsage}
    />
  ) : undefined;
  const downloadFileAction = (
    <Action
      key="downloadFile"
      shortcut={{ modifiers: ["cmd", "opt"], key: "d" }}
      icon={Icon.Download}
      title="Download GIF"
      onAction={downloadGIFAction}
    />
  );

  const actions: Array<(JSX.Element | undefined)[]> = [
    [copyFile, copyGifUrl, copyGifMarkdown],
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
