import { useContext } from "react";

import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";

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
  const { favIds } = state;

  const copyFileAction = () =>
    showHUD("Copying...")
      .then(() => copyFileToClipboard(gif_url, `${slug}.gif`))
      .catch(() => showHUD("Error copying file, please try again"))
      .then((file) => showHUD(`Copied GIF "${file}" to clipboard`));

  const openUrlInBrowser = url ? (
    <Action.OpenInBrowser key="openUrlInBrowser" url={url} shortcut={{ modifiers: ["cmd", "shift"], key: "b" }} />
  ) : undefined;
  const copyGifUrl = <Action.CopyToClipboard key="copyGifUrl" title="Copy GIF Link" content={stripQParams(gif_url)} />;
  const copyPageUrl = url ? (
    <Action.CopyToClipboard
      key="copyPageUrl"
      title="Copy Page Link"
      content={url}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
    />
  ) : undefined;
  const copyFile = (
    <Action
      icon={Icon.Clipboard}
      key="copyFile"
      title="Copy GIF"
      onAction={copyFileAction}
      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
    />
  );
  const viewDetails = (
    <Action.Push
      icon={Icon.Eye}
      key="viewDetails"
      title="View GIF Details"
      target={<GifDetails item={item} />}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
    />
  );

  let toggleFav: JSX.Element | undefined;
  if (service && favIds) {
    const actionIds = new Map([[service, new Set([id.toString()])]]);
    toggleFav = favIds?.get(service)?.has(id.toString()) ? (
      <Action
        icon={Icon.Star}
        key="toggleFav"
        title="Remove from Favorites"
        onAction={() => dispatch({ type: "remove", save: true, ids: actionIds, service })}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
    ) : (
      <Action
        icon={Icon.Star}
        key="toggleFav"
        title="Add to Favorites"
        onAction={() => dispatch({ type: "add", save: true, ids: actionIds, service })}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
    );
  }

  const actions: Array<(JSX.Element | undefined)[]> = [
    [copyFile, copyGifUrl],
    [toggleFav, showViewDetails ? viewDetails : undefined],
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
