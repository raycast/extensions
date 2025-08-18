/* eslint @raycast/prefer-title-case: off */
import { useEffect, useState } from "react";
import { Action, Icon } from "@raycast/api";
import { callbackLaunchCommand } from "raycast-cross-extension";
import { getIconSlug } from "./vender/simple-icons-sdk.js";
import { IconData, LaunchContext } from "./types.js";
import { copySvg, getAbsoluteFileLink, launchSocialBadge, makeCopyToDownload } from "./utils.js";
import Releases from "./views/releases.js";

type ActionProps = {
  icon: IconData;
  version: string;
};

export const OpenWith = ({ icon, version }: ActionProps) => {
  const [destinationPath, setDestinationPath] = useState<string>("");
  useEffect(() => {
    (async () => {
      const path = await makeCopyToDownload({ version, icon, slug: getIconSlug(icon) });
      if (path) setDestinationPath(path);
    })();
  }, []);
  return destinationPath ? <Action.OpenWith path={destinationPath} /> : null;
};

export const MakeBadge = ({ icon, version }: ActionProps) => (
  <Action icon="shieldsdotio.svg" title="Make Badge" onAction={() => launchSocialBadge(icon, version)} />
);

export const CopySvg = ({ icon, version }: ActionProps) => {
  return <Action title="Copy SVG" onAction={() => copySvg({ version, icon })} icon={Icon.Clipboard} />;
};

export const CopyColor = ({ icon }: ActionProps) => <Action.CopyToClipboard title="Copy Color" content={icon.hex} />;

export const CopyTitle = ({ icon }: ActionProps) => <Action.CopyToClipboard title="Copy Title" content={icon.title} />;

export const CopySlug = ({ icon }: ActionProps) => (
  <Action.CopyToClipboard title="Copy Slug" content={getIconSlug(icon)} />
);

export const CopyPath = ({ icon, version }: ActionProps) => (
  <Action title="Copy Path" onAction={() => copySvg({ version, icon, pathOnly: true })} icon={Icon.Clipboard} />
);

export const CopyCdn = ({ icon }: ActionProps) => {
  const simpleIconsCdnLink = `https://cdn.simpleicons.org/${getIconSlug(icon)}`;
  return <Action.CopyToClipboard title="Copy CDN Link" content={simpleIconsCdnLink} />;
};

export const CopyJsdelivr = ({ icon, version }: ActionProps) => {
  const jsdelivrCdnLink = `https://cdn.jsdelivr.net/npm/${version}/icons/${getIconSlug(icon)}.svg`;
  return <Action.CopyToClipboard title="Copy jsDelivr CDN Link" content={jsdelivrCdnLink} />;
};

export const CopyUnpkg = ({ icon, version }: ActionProps) => {
  const unpkgCdnLink = `https://unpkg.com/${version}/icons/${getIconSlug(icon)}.svg`;
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
    <Action.Push icon={Icon.Paragraph} title="View Release Notes" target={<Releases />} />
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

export const LaunchCommand = ({ callbackLaunchOptions, icon, version }: LaunchContext & ActionProps) => (
  <Action
    title="Use This Icon"
    icon={Icon.Checkmark}
    onAction={async () => {
      callbackLaunchCommand(callbackLaunchOptions, {
        icon: { ...icon, file: getAbsoluteFileLink(icon.slug, version) },
      });
    }}
  />
);

export const actions = {
  OpenWith,
  MakeBadge,
  CopySvg,
  CopyColor,
  CopyTitle,
  CopySlug,
  CopyPath,
  CopyCdn,
  CopyJsdelivr,
  CopyUnpkg,
};

export type ActionType = keyof typeof actions;

export const defaultActionsOrder: ActionType[] = [
  "OpenWith",
  "MakeBadge",
  "CopySvg",
  "CopyColor",
  "CopyTitle",
  "CopySlug",
  "CopyPath",
  "CopyCdn",
  "CopyJsdelivr",
  "CopyUnpkg",
];
