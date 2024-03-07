import { useEffect, useState } from "react";
import { Action, Clipboard, Icon, Toast, showHUD, showToast } from "@raycast/api";
import { loadSvg, makeCopyToDownload } from "./utils";

export const CopySvg = ({ slug, version }: { slug: string; version: string }) => (
  <Action
    title="Copy SVG"
    onAction={async () => {
      const toast = await showToast({
        style: Toast.Style.Success,
        title: "",
        message: "Fetching icon...",
      });
      const { svg } = await loadSvg(version, slug);
      toast.style = Toast.Style.Success;
      Clipboard.copy(svg);
      await showHUD("Copied to Clipboard");
    }}
    icon={Icon.Clipboard}
  />
);

export const OpenWith = ({ slug, version }: { slug: string; version: string }) => {
  const [destinationPath, setDestinationPath] = useState<string>("");

  useEffect(() => {
    (async () => {
      const path = await makeCopyToDownload(version, slug);
      setDestinationPath(path);
    })();
  }, []);

  return destinationPath ? <Action.OpenWith path={destinationPath} /> : null;
};

export const Supports = () => (
  <>
    <Action.OpenInBrowser
      title="Request a New Icon"
      url="https://github.com/simple-icons/simple-icons/issues/new?assignees=&labels=new+icon&template=icon_request.yml"
    />
    <Action.OpenInBrowser
      title="Report an Oudated Icon"
      url="https://github.com/simple-icons/simple-icons/issues/new?assignees=&labels=icon+outdated&template=icon_update.yml"
    />
  </>
);
