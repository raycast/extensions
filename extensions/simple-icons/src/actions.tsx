/* eslint @raycast/prefer-title-case: off */
import { useEffect, useState } from "react";
import { Action, Icon } from "@raycast/api";
import { callbackLaunchCommand } from "raycast-cross-extension";
import { getIconSlug } from "simple-icons/sdk";
import { IconData, LaunchContext } from "./types.js";
import { copySvg, makeCopyToDownload } from "./utils.js";

type ActionProps = {
  icon: IconData;
  version: string;
};

export const OpenWith = ({ icon, version }: ActionProps) => {
  const [destinationPath, setDestinationPath] = useState<string>("");
  useEffect(() => {
    (async () => {
      const path = await makeCopyToDownload({ version, icon, slug: getIconSlug(icon) });
      setDestinationPath(path);
    })();
  }, []);
  return destinationPath ? <Action.OpenWith path={destinationPath} /> : null;
};

export const CopySvg = ({ icon, version }: ActionProps) => {
  return <Action title="Copy SVG" onAction={() => copySvg({ version, icon })} icon={Icon.Clipboard} />;
};

export const CopyColor = ({ icon }: ActionProps) => <Action.CopyToClipboard title="Copy Color" content={icon.hex} />;

export const CopyTitle = ({ icon }: ActionProps) => <Action.CopyToClipboard title="Copy Title" content={icon.title} />;

export const CopySlug = ({ icon }: ActionProps) => (
  <Action.CopyToClipboard title="Copy Slug" content={getIconSlug(icon)} />
);

export const CopyCdn = ({ icon }: ActionProps) => {
  const simpleIconsCdnLink = `https://cdn.simpleicons.org/${getIconSlug(icon)}`;
  return <Action.CopyToClipboard title="Copy CDN Link" content={simpleIconsCdnLink} />;
};

export const CopyJsdelivr = ({ icon, version }: ActionProps) => {
  const jsdelivrCdnLink = `https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${getIconSlug(icon)}.svg`;
  return <Action.CopyToClipboard title="Copy jsDelivr CDN Link" content={jsdelivrCdnLink} />;
};

export const CopyUnpkg = ({ icon, version }: ActionProps) => {
  const unpkgCdnLink = `https://unpkg.com/simple-icons@${version}/icons/${getIconSlug(icon)}.svg`;
  return <Action.CopyToClipboard title="Copy unpkg CDN Link" content={unpkgCdnLink} />;
};

export const CopyFontEntities = ({ icon }: ActionProps) => (
  <>
    <Action.CopyToClipboard title="Copy Character" content={String.fromCodePoint(icon.code)} />
    <Action.CopyToClipboard title="Copy HTML Code" content={`&#${icon.code.toString()};`} />
    <Action.CopyToClipboard title="Copy UTF Code" content={`\\u{${icon.code.toString(16).toUpperCase()}}`} />
  </>
);

export const Supports = () => (
  <>
    <Action.OpenInBrowser
      title="Request a New Icon"
      url="https://github.com/simple-icons/simple-icons/issues/new?labels=new+icon&template=icon_request.yml"
    />
    <Action.OpenInBrowser
      title="Report an Oudated Icon"
      url="https://github.com/simple-icons/simple-icons/issues/new?labels=update+icon%2Fdata&template=icon_update.yml"
    />
  </>
);

export const LaunchCommand = ({ callbackLaunchOptions, icon }: LaunchContext & ActionProps) => (
  <Action
    title="Use This Icon"
    icon={Icon.Checkmark}
    onAction={async () => {
      callbackLaunchCommand(callbackLaunchOptions, { icon });
    }}
  />
);

export const actions = {
  OpenWith,
  CopySvg,
  CopyColor,
  CopyTitle,
  CopySlug,
  CopyCdn,
  CopyJsdelivr,
  CopyUnpkg,
};

export type ActionType = keyof typeof actions;

export const defaultActionsOrder: ActionType[] = [
  "OpenWith",
  "CopySvg",
  "CopyColor",
  "CopyTitle",
  "CopySlug",
  "CopyCdn",
  "CopyJsdelivr",
  "CopyUnpkg",
];
