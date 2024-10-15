import { useEffect, useState } from "react";
import { Action, Icon } from "@raycast/api";
import { callbackLaunchCommand } from "raycast-cross-extension";
import { titleToSlug } from "simple-icons/sdk";
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
      const path = await makeCopyToDownload({ version, icon, slug: icon.slug || titleToSlug(icon.title) });
      setDestinationPath(path);
    })();
  }, []);
  return destinationPath ? <Action.OpenWith path={destinationPath} /> : null;
};

export const CopySvg = ({ icon, version }: ActionProps) => {
  return <Action title="Copy SVG" onAction={() => copySvg({ version, icon })} icon={Icon.Clipboard} />;
};

export const CopyColor = ({ icon }: ActionProps) => <Action.CopyToClipboard title="Copy Color" content={icon.hex} />;

export const CopySlug = ({ icon }: ActionProps) => (
  <Action.CopyToClipboard title="Copy Slug" content={icon.slug || titleToSlug(icon.title)} />
);

export const CopyCdn = ({ icon }: ActionProps) => {
  const simpleIconsCdnLink = `https://cdn.simpleicons.org/${icon.slug || titleToSlug(icon.title)}`;
  return <Action.CopyToClipboard title="Copy CDN Link" content={simpleIconsCdnLink} />;
};

export const CopyJsdelivr = ({ icon, version }: ActionProps) => {
  const jsdelivrCdnLink = `https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${icon.slug || titleToSlug(icon.title)}.svg`;
  return <Action.CopyToClipboard title="Copy jsDelivr CDN Link" content={jsdelivrCdnLink} />;
};

export const CopyUnpkg = ({ icon, version }: ActionProps) => {
  const unpkgCdnLink = `https://unpkg.com/simple-icons@${version}/icons/${icon.slug || titleToSlug(icon.title)}.svg`;
  // eslint-disable-next-line @raycast/prefer-title-case
  return <Action.CopyToClipboard title="Copy unpkg CDN Link" content={unpkgCdnLink} />;
};

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
  "CopySlug",
  "CopyCdn",
  "CopyJsdelivr",
  "CopyUnpkg",
];
