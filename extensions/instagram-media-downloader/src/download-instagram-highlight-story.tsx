import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  LaunchProps,
  Toast,
  getPreferenceValues,
  open,
  showToast,
  Keyboard,
} from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { existsSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useRef, useState } from "react";
import { BrowserMiss, readReelFromBrowser } from "./browser-tab";
import {
  BROWSER_EXTENSION_URL,
  downloadMediaSet,
  handleDownload,
  OPEN_TAB_SHORTCUT,
  revealActions,
  runExclusive,
  showErrorToast,
  watchBrowser,
} from "./download-media";
import { ReelItem } from "./instagram-reel";
import { canonicalStoryUrl, InstagramStoryRef, parseInstagramStoryUrl } from "./instagram-url";
import { countOf } from "./media-files";

function getUniqueFilePath(folder: string, baseName: string, extension: string): string {
  let filePath = join(folder, `${baseName}${extension}`);
  let counter = 1;

  while (existsSync(filePath)) {
    filePath = join(folder, `${baseName}-${counter}${extension}`);
    counter++;
  }

  return filePath;
}

export default function Command({
  arguments: { instagramUrl },
}: LaunchProps<{ arguments: Arguments.DownloadInstagramHighlightStory }>) {
  const { mediaDownloadPath } = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [highlightUrls, setHighlightUrls] = useState<HighlightItem[]>([]);
  const [miss, setMiss] = useState<BrowserMiss | "bad-link">();
  const unmounted = useRef(false);
  /** The one watch ⌘T started; pressing it again only reopens the tab. */
  const watching = useRef(false);
  const ref = parseInstagramStoryUrl(instagramUrl);
  const highlight = ref?.kind === "highlight" ? ref : undefined;
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const downloadFolder = mediaDownloadPath || `${homedir()}/Downloads`;

  const toggleSelection = (url: string) => {
    setSelectedUrls((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedUrls(new Set(highlightUrls.map((item) => item.url)));
  };

  const deselectAll = () => {
    setSelectedUrls(new Set());
  };

  const downloadSelected = async () => {
    const selectedItems = highlightUrls.filter((item) => selectedUrls.has(item.url));
    if (selectedItems.length === 0) return;

    try {
      await runExclusive(() =>
        downloadMediaSet(
          selectedItems.map((item) => ({
            url: item.url,
            name: item.name,
          })),
          downloadFolder,
          "Story",
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      await showErrorToast("Error", message);
    }
  };

  const saveSelectedUrls = async () => {
    const selectedItems = highlightUrls.filter((item) => selectedUrls.has(item.url));
    if (selectedItems.length === 0) return;

    try {
      const filePath = getUniqueFilePath(downloadFolder, "highlight-urls", ".json");
      writeFileSync(filePath, JSON.stringify(selectedItems.map(toSavedUrl), null, 2));
      await showToast({
        title: "Success",
        message: `Saved ${countOf(selectedItems.length, "URL")} to ${filePath}`,
        style: Toast.Style.Success,
        ...revealActions(filePath),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      await showErrorToast("Error", message);
    }
  };

  const show = (items: HighlightItem[]) => {
    logger.log(`[download-instagram-highlight-story] Resolved`, { items: items.length });
    setHighlightUrls(items);
    setMiss(undefined);
  };

  useEffect(() => {
    // React can mount, unmount and remount a view (it does in development), so "closed" is reset
    // on every mount and each read is canceled only by its own mount's cleanup.
    unmounted.current = false;
    let canceled = false;
    if (!highlight) {
      setMiss("bad-link");
      setIsLoading(false);
    } else {
      logger.log(`[download-instagram-highlight-story] Reading from the browser`);
      readReelFromBrowser(highlight).then((result) => {
        if (canceled) return;
        if (result.ok) show(toHighlightItems(highlight, result.items));
        else setMiss(result);
        setIsLoading(false);
      });
    }
    return () => {
      canceled = true;
      unmounted.current = true;
    };
  }, []);

  /** Open the highlight in a new tab and fill the grid as soon as that tab has it. */
  const openAndWatch = async (target: Extract<InstagramStoryRef, { kind: "highlight" }>) => {
    await open(canonicalStoryUrl(target));
    if (watching.current) return;
    watching.current = true;
    setIsLoading(true);
    const found = await watchBrowser(
      () => readReelFromBrowser(target),
      () => unmounted.current,
    );
    watching.current = false;
    // Leaving the view cancels the watch; that is not a failure to report.
    if (unmounted.current) return;
    setIsLoading(false);
    if (found) show(toHighlightItems(target, found.items));
    else await showErrorToast("Could Not Read the Highlight", "It didn't load in your browser within 30 seconds.");
  };

  if (miss) {
    const badLink = miss === "bad-link";
    const unavailable = !badLink && miss.reason === "unavailable";
    // The browser extension doesn't exist on Windows, so offering to install it can't help there.
    const onWindows = process.platform === "win32";
    return (
      <Grid isLoading={isLoading}>
        <Grid.EmptyView
          icon={Icon.Globe}
          title={
            badLink
              ? "Not an Instagram Highlight Link"
              : unavailable
                ? "Needs the Raycast Browser Extension"
                : "Open the Highlight in Your Browser"
          }
          description={
            badLink
              ? "Paste a link like instagram.com/stories/highlights/…"
              : unavailable
                ? onWindows
                  ? "Highlights are read through the Raycast browser extension, which isn't available on Windows."
                  : "Highlights are read from your browser tab. Press ↵ to install it."
                : "Press ↵ to open it; it appears here once it loads."
          }
          actions={
            unavailable
              ? !onWindows && (
                  <ActionPanel>
                    <Action.OpenInBrowser title="Install Browser Extension" url={BROWSER_EXTENSION_URL} />
                  </ActionPanel>
                )
              : highlight && (
                  <ActionPanel>
                    <Action
                      title="Open in Browser"
                      icon={Icon.Globe}
                      shortcut={OPEN_TAB_SHORTCUT}
                      onAction={() => openAndWatch(highlight)}
                    />
                  </ActionPanel>
                )
          }
        />
      </Grid>
    );
  }

  return (
    <Grid isLoading={isLoading} columns={5} fit={Grid.Fit.Fill}>
      {highlightUrls.map((item) => {
        const isSelected = selectedUrls.has(item.url);
        return (
          <Grid.Item
            key={item.url}
            content={item.img}
            accessory={isSelected ? { icon: Icon.Checkmark } : undefined}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.Circle : Icon.Checkmark}
                    onAction={() => toggleSelection(item.url)}
                  />
                  <Action
                    title="Select All"
                    icon={Icon.CheckList}
                    onAction={selectAll}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "a" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "a" },
                    }}
                  />
                  <Action
                    title="Deselect All"
                    icon={Icon.XMarkCircle}
                    onAction={deselectAll}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "x" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "x" },
                    }}
                  />
                </ActionPanel.Section>
                {selectedUrls.size > 0 && (
                  <ActionPanel.Section title={`Selected (${selectedUrls.size})`}>
                    <Action
                      title="Download Selected"
                      icon={Icon.Download}
                      onAction={downloadSelected}
                      shortcut={{
                        macOS: { modifiers: ["opt", "shift"], key: "d" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                      }}
                    />
                    <Action title="Save Selected Urls to JSON" icon={Icon.Document} onAction={saveSelectedUrls} />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section title="Single Item">
                  <Action
                    title="Download Story"
                    icon={Icon.Download}
                    onAction={async () => {
                      try {
                        await runExclusive(() => handleDownload(item.url, item.name, downloadFolder, "Story"));
                      } catch (error) {
                        const message = error instanceof Error ? error.message : "Unknown error occurred";
                        await showErrorToast("Error", message);
                      }
                    }}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "d" },
                      Windows: { modifiers: ["ctrl"], key: "d" },
                    }}
                  />
                  <Action
                    title="Save Highlight URL to JSON File"
                    icon={Icon.Document}
                    onAction={async () => {
                      try {
                        const filePath = getUniqueFilePath(downloadFolder, "highlight-urls", ".json");
                        writeFileSync(filePath, JSON.stringify(highlightUrls.map(toSavedUrl), null, 2));
                        await showToast({
                          title: "Success",
                          message: `Saved to ${filePath}`,
                          style: Toast.Style.Success,
                          ...revealActions(filePath),
                        });
                      } catch (error) {
                        const message = error instanceof Error ? error.message : "Unknown error occurred";
                        await showErrorToast("Error", message);
                      }
                    }}
                    shortcut={Keyboard.Shortcut.Common.Save}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}

type HighlightItem = { img: string; url: string; name: string };

/** In the order Instagram plays them, named `highlight-<id>-<n>` like a carousel's files. */
function toHighlightItems(ref: { highlightId: string }, items: ReelItem[]): HighlightItem[] {
  return items.map((item, index) => ({
    img: item.thumbnail,
    url: item.url,
    name: `highlight-${ref.highlightId}-${index + 1}`,
  }));
}

/** The saved JSON keeps the shape it always had. */
function toSavedUrl({ img, url }: HighlightItem) {
  return { img, url };
}
