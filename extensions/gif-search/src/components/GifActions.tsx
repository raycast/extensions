import { useContext } from "react";

import { Action, ActionPanel, Icon, showToast, Toast, showHUD, Clipboard, showInFinder, open } from "@raycast/api";

import { getDefaultAction, ServiceName } from "../preferences";

import AppContext, { AppStateAction } from "./AppContext";
import { GifDetails } from "./GifDetails";
import { IGif } from "../models/gif";

import copyFileToClipboard from "../lib/copyFileToClipboard";
import stripQParams from "../lib/stripQParams";
import downloadFile from "../lib/downloadFile";

interface GifActionsProps {
  item: IGif;
  showViewDetails: boolean;
  service?: ServiceName;
  visitGifItem?: (gif: IGif) => void;
  loadMoreGifs?: () => void;
}

export function GifActions({ item, showViewDetails, service, visitGifItem, loadMoreGifs }: GifActionsProps) {
  const { id, url, gif_url } = item;
  const { state, dispatch } = useContext(AppContext);
  const { favIds, recentIds } = state;
  const safeDispatch = (action: AppStateAction) => {
    try {
      dispatch(action);
    } catch (error) {
      console.error(error);
    }
  };

  const actionIds = new Map([[service as ServiceName, new Set([id.toString()])]]);

  const trackUsage = () => {
    safeDispatch({ type: "add", save: true, recentIds: actionIds, service });
    visitGifItem?.(item);
  };
  const removeFromRecents = () => safeDispatch({ type: "remove", save: true, recentIds: actionIds, service });
  const addToFav = () => safeDispatch({ type: "add", save: true, favIds: actionIds, service });

  const removeFav = () => safeDispatch({ type: "remove", save: true, favIds: actionIds, service });

  const copyFileAction = () =>
    showToast({
      style: Toast.Style.Animated,
      title: "Copying...",
    })
      .then((toast) => {
        return copyFileToClipboard(item.download_url, item.download_name).then((file) => {
          toast.hide();
          showHUD(`Copied GIF "${file}" to clipboard`);
        });
      })
      .catch((e: Error) =>
        showToast({
          style: Toast.Style.Failure,
          title: "Error, please try again",
          message: e?.message,
          primaryAction: {
            title: "Copy Error Message",
            onAction: (toast) => Clipboard.copy(toast.message ?? ""),
            shortcut: { modifiers: ["cmd"], key: "c" },
          },
        })
      );

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
        title: "Failed to download GIF",
        message: item.download_name,
      });
    }
  };

  const copyFile = (
    <Action
      icon={Icon.Clipboard}
      key="copyFile"
      title="Copy GIF"
      onAction={() => copyFileAction().then(trackUsage)}
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
  const isFav = favIds?.get(service as ServiceName)?.has(id.toString());
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

  const isRecent = recentIds?.get(service as ServiceName)?.has(id.toString());
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
      target={<GifDetails item={item} service={service} />}
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

      {loadMoreGifs ? (
        <Action
          title="Load More GIFs"
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          icon={Icon.ArrowDown}
          onAction={loadMoreGifs}
        />
      ) : null}
    </ActionPanel>
  );
}
