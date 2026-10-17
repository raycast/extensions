import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  LaunchProps,
  Toast,
  getPreferenceValues,
  popToRoot,
  showToast,
} from "@raycast/api";
import { existsSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useState } from "react";
import { getInstagramHighlightStoryURL, handleDownload, mediaExtensionAndId, showErrorToast } from "./download-media";

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
}: LaunchProps<{
  arguments: { instagramUrl: string };
}>) {
  const { mediaDownloadPath } = getPreferenceValues();
  const [isLoading, setIsLoading] = useState(true);
  const [highlightUrls, setHighlightUrls] = useState<{ img: string; url: string }[]>([]);
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

    await showToast({
      title: "Downloading",
      message: `Downloading ${selectedItems.length} item(s)...`,
      style: Toast.Style.Animated,
    });

    try {
      for (const item of selectedItems) {
        const { ext, fileId } = mediaExtensionAndId(item.url);
        await handleDownload(item.url, fileId || "instagram-story", downloadFolder, ext);
      }
      await showToast({
        title: "Success",
        message: `Downloaded ${selectedItems.length} item(s)`,
        style: Toast.Style.Success,
      });
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
      writeFileSync(filePath, JSON.stringify(selectedItems, null, 2));
      await showToast({
        title: "Success",
        message: `Saved ${selectedItems.length} URL(s) to ${filePath}`,
        style: Toast.Style.Success,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      await showErrorToast("Error", message);
    }
  };

  useEffect(() => {
    const fetchHighlightStory = async () => {
      if (!instagramUrl.includes("instagram.com")) {
        await popToRoot();
        await showErrorToast("Error", "Invalid URL provided. Please provide a valid instagram URL");
        return;
      }

      try {
        const parsedUrl = new URL(instagramUrl);
        const pathParts = parsedUrl.pathname.replace(/^\/+|\/+$/g, "").split("/");

        if (pathParts.length !== 3 || pathParts[0] !== "stories" || pathParts[1] !== "highlights") {
          await popToRoot();
          await showErrorToast("Error", "Invalid Instagram highlight story URL format.");
          return;
        }

        const fetchedUrls = await getInstagramHighlightStoryURL(instagramUrl);

        if (fetchedUrls === null) {
          // Helper already showed a failure toast.
          await popToRoot();
          return;
        }

        if (fetchedUrls.length === 0) {
          await popToRoot();
          await showErrorToast("Error", "No highlight story found at the provided URL");
          return;
        }

        fetchedUrls.reverse();

        setHighlightUrls(fetchedUrls);
        setIsLoading(false);
      } catch (error) {
        await popToRoot();
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        await showErrorToast("Error", message);
      }
    };

    fetchHighlightStory();
  }, []);

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
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "s" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                    }}
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
                    <Action
                      title="Save Selected Urls to JSON"
                      icon={Icon.Document}
                      onAction={saveSelectedUrls}
                      shortcut={{
                        macOS: { modifiers: ["opt", "alt"], key: "s" },
                        Windows: { modifiers: ["ctrl", "alt"], key: "s" },
                      }}
                    />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section title="Single Item">
                  <Action
                    title="Download Story"
                    icon={Icon.Download}
                    onAction={async () => {
                      try {
                        const { ext, fileId } = mediaExtensionAndId(item.url);
                        await handleDownload(item.url, fileId || "instagram-story", downloadFolder, ext);
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
                        writeFileSync(filePath, JSON.stringify(highlightUrls, null, 2));
                        await showToast({
                          title: "Success",
                          message: `Saved to ${filePath}`,
                          style: Toast.Style.Success,
                        });
                      } catch (error) {
                        const message = error instanceof Error ? error.message : "Unknown error occurred";
                        await showErrorToast("Error", message);
                      }
                    }}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "s" },
                      Windows: { modifiers: ["ctrl"], key: "s" },
                    }}
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
