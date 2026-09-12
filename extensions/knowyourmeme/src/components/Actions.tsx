import { Action, ActionPanel, Icon, getPreferenceValues, showInFinder, Keyboard, showToast, Toast } from "@raycast/api";
import { MemeDetail } from "./MemeDetail";
import { useEffect, useMemo, useState } from "react";
import { downloadImage, copyImage } from "../utils/image";
import { getMeme, MemeDetails, MemeResult, SectionBlock } from "knowyourmeme-js";
import { isMacOS } from "../utils/helpers";

const preferences = getPreferenceValues();
const downloadPath = preferences.downloadPath;
const showDownloadedImageInFinder = preferences.showDownloadedImageInFinder;

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

export function ShowDetailsAction({ meme }: { meme: MemeResult }) {
  return <Action.Push icon={Icon.Sidebar} title="Show Details" target={<MemeDetail meme={meme} />} />;
}

export function OpenInBrowserAction({ meme }: { meme: MemeResult }) {
  return <Action.OpenInBrowser url={meme.link} />;
}

export function ToggleLayoutAction({ layout, onToggleLayout }: { layout: string; onToggleLayout: () => void }) {
  return (
    <Action
      title="Toggle Layout"
      icon={layout === "grid" ? Icon.AppWindowList : Icon.AppWindowGrid3x3}
      onAction={onToggleLayout}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "l" },
        Windows: { modifiers: ["ctrl"], key: "l" },
      }}
    />
  );
}

export function RefreshAction<T>({ revalidate }: { revalidate: () => Promise<T> | void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={() => revalidate()}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
}

export function CopyThumbnailAction({ meme }: { meme: MemeResult }) {
  const data = useMemeThumbnail(meme.link);

  return (
    <Action
      title="Copy Thumbnail"
      icon={Icon.Clipboard}
      onAction={async () => {
        const toast = await showToast({
          title: "Copying thumbnail…",
          style: Toast.Style.Animated,
        });
        try {
          await copyImage(data ?? "");
          toast.title = "Copied to clipboard";
          toast.style = Toast.Style.Success;
        } catch {
          toast.title = "Failed to copy thumbnail";
          toast.style = Toast.Style.Failure;
        }
      }}
    />
  );
}

export function DownloadThumbnailAction({ meme }: { meme: MemeResult }) {
  const data = useMemeThumbnail(meme.link);

  return (
    <Action
      title="Download Thumbnail"
      icon={Icon.Download}
      onAction={async () => {
        const toast = await showToast({
          title: "Downloading thumbnail…",
          style: Toast.Style.Animated,
        });
        try {
          const filePath = await downloadImage(data, downloadPath ?? "");
          toast.title = `Thumbnail downloaded to ${downloadPath}`;
          toast.style = Toast.Style.Success;
          toast.primaryAction = {
            title: `Show in ${isMacOS ? "Finder" : "File Explorer"}`,
            onAction: () => showInFinder(filePath),
            shortcut: Keyboard.Shortcut.Common.OpenWith,
          };
          if (showDownloadedImageInFinder) await showInFinder(filePath);
        } catch {
          toast.title = `Failed to download thumbnail`;
          toast.style = Toast.Style.Failure;
        }
      }}
      shortcut={{
        macOS: { modifiers: ["shift"], key: "return" },
        Windows: { modifiers: ["shift"], key: "enter" },
      }}
    />
  );
}

export function GetImagesAction({ memeDetails }: { memeDetails: MemeDetails }) {
  const sections = useMemo(() => {
    let count = 0;
    return memeDetails.sections.map((section) => {
      const images = section.contents
        .filter((content): content is Extract<SectionBlock, { type: "image" }> => content.type === "image")
        .map((image) => ({ ...image, number: ++count }));
      return { title: section.title, images };
    });
  }, [memeDetails]);

  return (
    <ActionPanel.Submenu icon={Icon.Image} title="Get Images" shortcut={Keyboard.Shortcut.Common.Save}>
      {sections.map((section) =>
        section.images.length > 0 ? (
          <ActionPanel.Section key={section.title} title={section.title}>
            {section.images.map((image) => (
              <ActionPanel.Submenu
                key={image.url}
                title={`Image ${image.number} (${filenameFromUrl(image.url)})`}
                icon={{ source: image.url }}
              >
                <CopyImageAction url={image.url} />
                <DownloadImageAction url={image.url} />
              </ActionPanel.Submenu>
            ))}
          </ActionPanel.Section>
        ) : null,
      )}
    </ActionPanel.Submenu>
  );
}

function filenameFromUrl(url: string): string {
  const clean = url.split("?")[0];
  const last = clean.split("/").pop();
  return last && last.trim() ? last : url;
}

function CopyImageAction({ url }: { url: string }) {
  return (
    <Action
      title="Copy Image"
      icon={Icon.Clipboard}
      onAction={async () => {
        const toast = await showToast({
          title: "Copying image…",
          style: Toast.Style.Animated,
        });
        try {
          await copyImage(url);
          toast.title = "Copied to clipboard";
          toast.style = Toast.Style.Success;
        } catch {
          toast.title = "Failed to copy image";
          toast.style = Toast.Style.Failure;
        }
      }}
    />
  );
}

function DownloadImageAction({ url }: { url: string }) {
  return (
    <Action
      title="Download Image"
      icon={Icon.Download}
      onAction={async () => {
        const toast = await showToast({
          title: "Downloading image…",
          style: Toast.Style.Animated,
        });
        try {
          const filePath = await downloadImage(url, downloadPath ?? "");
          toast.title = `Image downloaded to ${downloadPath}`;
          toast.style = Toast.Style.Success;
          toast.primaryAction = {
            title: `Show in ${isMacOS ? "Finder" : "File Explorer"}`,
            onAction: () => showInFinder(filePath),
            shortcut: Keyboard.Shortcut.Common.OpenWith,
          };
          if (showDownloadedImageInFinder) await showInFinder(filePath);
        } catch {
          toast.title = "Failed to download image";
          toast.style = Toast.Style.Failure;
        }
      }}
    />
  );
}

export function CopyUrlAction({ meme }: { meme: MemeResult }) {
  return <Action.CopyToClipboard title="Copy URL" content={meme.link} shortcut={Keyboard.Shortcut.Common.Copy} />;
}
