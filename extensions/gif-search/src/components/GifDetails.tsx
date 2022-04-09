import { useContext } from "react";

import { Action, ActionPanel, Icon, Detail, showHUD } from "@raycast/api";
import FileSizeFormat from "@saekitominaga/file-size-format";

import { getShowPreview, getDefaultAction } from "../preferences";

import AppContext from "../components/AppContext";
import { IGif, renderGifMarkdownDetails } from "../models/gif";
import copyFileToClipboard from "../lib/copyFileToClipboard";
import stripQParams from "../lib/stripQParams";

export function GifDetails(props: { item: IGif }) {
  const { metadata } = props.item;

  const tags = [];
  if (metadata?.tags?.length) {
    tags.push(
      <Detail.Metadata.TagList title="tags">
        {metadata.tags.map((tag, index) => (
          <Detail.Metadata.TagList.Item text={tag} key={index} />
        ))}
      </Detail.Metadata.TagList>
    );
  }
  const labels = metadata?.labels
    ?.filter(Boolean)
    .map(({ title, text }, index) => <Detail.Metadata.Label title={title} text={text} key={index} />);
  const links = metadata?.links
    ?.filter(Boolean)
    .map(({ title, text, target }, index) => (
      <Detail.Metadata.Link title={title} text={text} target={target} key={index} />
    ));

  return (
    <Detail
      markdown={renderGifMarkdownDetails(props.item)}
      actions={<GifDetailsActions item={props.item} showViewDetails={false} />}
      metadata={
        metadata ? (
          <Detail.Metadata>
            {metadata?.width ? <Detail.Metadata.Label title="Width" text={metadata.width.toString()} /> : undefined}
            {metadata?.height ? <Detail.Metadata.Label title="Height" text={metadata.height.toString()} /> : undefined}
            {metadata?.size && <Detail.Metadata.Label title="Size" text={FileSizeFormat.si(metadata?.size)} />}
            {labels}
            {links}
            {tags}
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}

export function GifDetailsActions(props: { item: IGif; showViewDetails: boolean }) {
  const { title, url, gif_url, slug } = props.item;

  const { state, dispatch } = useContext(AppContext);
  const { favIds, service } = state;

  const showPreview = getShowPreview();

  const copyFileAction = () =>
    showHUD("Copying...")
      .then(() => copyFileToClipboard(gif_url, `${slug}.gif`))
      .catch(() => showHUD("Error copying file, please try again"))
      .then((file) => showHUD(`Copied GIF "${file}" to clipboard`));

  const openInBrowser = url ? <Action.OpenInBrowser key="openInBrowser" url={url} /> : undefined;
  const copyGifUrl = (
    <Action.CopyToClipboard key="copyGifUrl" title="Copy GIF URL to Clipboard" content={stripQParams(gif_url)} />
  );
  const copyPageUrl = url ? (
    <Action.CopyToClipboard
      key="copyPageUrl"
      title="Copy Page URL to Clipboard"
      content={url}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
    />
  ) : undefined;
  const copyFile = (
    <Action
      icon={Icon.Clipboard}
      key="copyFile"
      title="Copy File to Clipboard"
      onAction={copyFileAction}
      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
    />
  );
  const viewDetails = (
    <Action.Push
      icon={Icon.Eye}
      key="viewDetails"
      title="View GIF Details"
      target={<GifDetails item={props.item} />}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
    />
  );

  let toggleFave: JSX.Element | undefined;
  if (service && favIds) {
    toggleFave = favIds?.has(props.item.id.toString()) ? (
      <Action
        icon={Icon.Star}
        key="rmFromFavs"
        title="Remove from Favorites"
        onAction={() => dispatch({ type: "remove", save: true, ids: [props.item.id], service })}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
    ) : (
      <Action
        icon={Icon.Star}
        key="addToFavs"
        title="Add to Favorites"
        onAction={() => dispatch({ type: "add", save: true, ids: [props.item.id], service })}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
    );
  }

  const actions = [copyFile, copyGifUrl, toggleFave, copyPageUrl, openInBrowser];
  if (props.showViewDetails) {
    if (showPreview) {
      // Put View Details to the end if using gif preview
      actions.push(viewDetails);
    } else {
      // Otherwise at the end
      actions.unshift(viewDetails);
    }
  }

  const defaultAction = getDefaultAction();
  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];

    if (action?.key == defaultAction) {
      // Move matching action to the front of the array to make it the default
      actions.splice(index, 1);
      actions.unshift(action);
    }
  }

  return <ActionPanel title={title}>{actions}</ActionPanel>;
}
