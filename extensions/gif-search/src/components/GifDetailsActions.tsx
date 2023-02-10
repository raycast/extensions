import { useContext } from "react";

import { Action, ActionPanel, Icon, showToast, Toast, showHUD, Clipboard } from "@raycast/api";

import { getDefaultAction, ServiceName } from "../preferences";

import AppContext from "../components/AppContext";
import { GifDetails } from "./GifDetails";
import { IGif } from "../models/gif";

import copyFileToClipboard from "../lib/copyFileToClipboard";
import stripQParams from "../lib/stripQParams";

export function GifDetailsActions(props: { item: IGif; showViewDetails: boolean; service?: ServiceName }) {
  const actions = getActions(props.item, props.showViewDetails, props.service);

  return (
    <ActionPanel title={props.item.title}>
      {actions.map((section, index) => (
        <ActionPanel.Section key={index}>{section}</ActionPanel.Section>
      ))}
    </ActionPanel>
  );
}

export function getActions(item: IGif, showViewDetails: boolean, service?: ServiceName) {
  const { id, url, gif_url, slug } = item;
  const { state, dispatch } = useContext(AppContext);
  const { favIds, recentIds } = state;

  const actionIds = new Map([[service as ServiceName, new Set([id.toString()])]]);

  const trackUsage = () => dispatch({ type: "add", save: true, recentIds: actionIds, service });
  const removeFromRecents = () => dispatch({ type: "remove", save: true, recentIds: actionIds, service });

  const addToFav = () => dispatch({ type: "add", save: true, favIds: actionIds, service });

  const removeFav = () => dispatch({ type: "remove", save: true, favIds: actionIds, service });

  const copyFileAction = () =>
    showToast({
      style: Toast.Style.Animated,
      title: "Copying...",
    })
      .then((toast) => {
        return copyFileToClipboard(gif_url, `${slug}.gif`).then((file) => {
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

  const openUrlInBrowser = url ? (
    <Action.OpenInBrowser key="openUrlInBrowser" url={url} shortcut={{ modifiers: ["cmd", "shift"], key: "b" }} />
  ) : undefined;
  const copyGifUrl = <Action.CopyToClipboard key="copyGifUrl" title="Copy GIF Link" content={stripQParams(gif_url)} />;
  const copyGifMarkdown = (
    <Action.CopyToClipboard
      key="copyGifMarkdown"
      title="Copy GIF Markdown"
      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      content={`![${item.title}](${stripQParams(gif_url)})`}
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
  const copyFile = (
    <Action
      icon={Icon.Clipboard}
      key="copyFile"
      title="Copy GIF"
      onAction={() => copyFileAction().then(trackUsage)}
      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
    />
  );
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

  let toggleFav: JSX.Element | undefined;
  const isFav = favIds?.get(service as ServiceName)?.has(id.toString());
  if (favIds) {
    toggleFav = isFav ? (
      <Action
        icon={Icon.Star}
        key="toggleFav"
        title="Remove from Favorites"
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
    <Action icon={Icon.Clock} key="removeRecent" title="Remove from Recents" onAction={removeFromRecents} />
  ) : undefined;

  const actions: Array<(JSX.Element | undefined)[]> = [
    [copyFile, copyGifUrl, copyGifMarkdown],
    [toggleFav, removeRecent, showViewDetails ? viewDetails : undefined],
    [copyPageUrl, openUrlInBrowser],
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

  return actions;
}
