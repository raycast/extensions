import {
  Action,
  Icon,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
  showToast,
  showInFinder,
} from "@raycast/api";
import { MemeDetail } from "./MemeDetail";
import { SearchResult } from "../types";
import { useEffect, useState } from "react";
import { downloadImage, copyImage } from "../utils/image";
import { getMeme } from "knowyourmeme-js";

function useMemeThumbnail(url: string) {
  const [data, setData] = useState<string>("");
  useEffect(() => {
    if (!url) return;
    (async () => {
      const res = await getMeme(url);
      setData(res?.image?.url ?? "");
    })();
  }, [url]);
  return data;
}

export function ActionShowDetails({ searchResult }: { searchResult: SearchResult }) {
  return <Action.Push icon={Icon.Sidebar} title="Show Details" target={<MemeDetail searchResult={searchResult} />} />;
}

export function ActionOpenInBrowser({ searchResult }: { searchResult: SearchResult }) {
  return <Action.OpenInBrowser url={searchResult.url} />;
}

export function ActionCopyThumbnail({ searchResult }: { searchResult: SearchResult }) {
  const data = useMemeThumbnail(searchResult.url);

  return (
    <Action
      title="Copy Thumbnail"
      icon={Icon.Clipboard}
      onAction={async () => {
        await copyImage(data ?? "");
        await showHUD("Copied to Clipboard");
      }}
    />
  );
}

export function ActionDownloadThumbnail({ searchResult }: { searchResult: SearchResult }) {
  const preferences = getPreferenceValues<Preferences>();
  const downloadPath = preferences.downloadPath;

  const data = useMemeThumbnail(searchResult.url);

  return (
    <Action
      title="Download Thumbnail"
      icon={Icon.Download}
      onAction={async () => {
        const filePath = await downloadImage(data ?? "", downloadPath ?? "");
        await showHUD(`Downloaded to ${downloadPath}`);
        await showInFinder(filePath);
      }}
      shortcut={{
        macOS: { modifiers: ["shift"], key: "return" },
        windows: { modifiers: ["shift"], key: "enter" },
      }}
    />
  );
}

export function ActionCopyTemplateImage({ templateImageUrl }: { templateImageUrl: string }) {
  return (
    <Action
      title="Copy Template Image"
      icon={Icon.Clipboard}
      onAction={async () => {
        if (templateImageUrl) {
          await copyImage(templateImageUrl);
          await showHUD("Copied to Clipboard");
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "This meme has no template image",
            message: "This meme does not contain a template image",
          });
        }
      }}
    />
  );
}

export function ActionDownloadTemplateImage({ templateImageUrl }: { templateImageUrl: string }) {
  const preferences = getPreferenceValues<Preferences>();
  const downloadPath = preferences.downloadPath;

  return (
    <Action
      title="Download Template Image"
      icon={Icon.Download}
      onAction={async () => {
        if (templateImageUrl) {
          const filePath = await downloadImage(templateImageUrl ?? "", downloadPath ?? "");
          await showHUD(`Downloaded to ${downloadPath}`);
          await showInFinder(filePath);
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "This meme has no template image",
            message: "This meme does not contain a template image",
          });
        }
      }}
    />
  );
}

export function ActionCopyUrl({ searchResult }: { searchResult: SearchResult }) {
  return (
    <Action.CopyToClipboard
      title="Copy URL"
      content={searchResult.url}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "c" },
        windows: { modifiers: ["ctrl", "shift"], key: "c" },
      }}
    />
  );
}

export function ActionOpenExtensionPreferences() {
  return (
    <Action
      icon={Icon.Cog}
      title="Open Extension Preferences"
      onAction={openExtensionPreferences}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "," },
        windows: { modifiers: ["ctrl", "shift"], key: "," },
      }}
    />
  );
}
