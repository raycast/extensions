import fs from "fs";
import fetch from "node-fetch";
import { runAppleScript } from "run-applescript";
import tempy from "tempy";

import { Action, ActionPanel, Icon, Detail, showHUD } from "@raycast/api";
import FileSizeFormat from "@saekitominaga/file-size-format";

import { getShowPreview, getDefaultAction } from "../preferences";
import { IGif, renderGifMarkdownDetails } from "../models/gif";

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
  const { title, url, gif_url } = props.item;

  const showPreview = getShowPreview();

  const openInBrowser = url ? <Action.OpenInBrowser key="openInBrowser" url={url} /> : undefined;
  const copyGif = (
    <Action.CopyToClipboard key="copyGifUrl" title="Copy GIF URL to Clipboard" content={stripQParams(gif_url)} />
  );
  const copyUrl = url ? (
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
      onAction={() => copyFileToClipboard(gif_url)}
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

  const actions = [openInBrowser, copyGif, copyFile, copyUrl];
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

async function copyFileToClipboard(url: string) {
  await showHUD("Copying...");

  const response = await fetch(url);

  if (response.status !== 200) {
    await showHUD(`GIF file download failed. Server responded with ${response.status}`);
    return;
  }

  if (response.body !== null) {
    const file = tempy.file({ extension: ".gif" });
    response.body.pipe(fs.createWriteStream(file));

    await runAppleScript(`tell app "Finder" to set the clipboard to ( POSIX file "${file}" )`);
    await showHUD("Copied GIF to clipboard");
  }
}

function stripQParams(url: string) {
  const earl = new URL(url);
  earl.search = "";
  return earl.toString();
}
