import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { FileService, CONFIG, WindowService } from "./utils";
import type { CapturedData } from "./utils";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { watch } from "node:fs";
import { CaptureDetail } from "./components/CaptureDetail";
import { CommentForm } from "./components/CommentForm";

interface CaptureFile {
  path: string;
  metadataPath: string;
  data: CapturedData;
  timestamp: Date;
}

export default function Command() {
  const [captures, setCaptures] = useState<CaptureFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCaptures = useCallback(async () => {
    setIsLoading(true);
    try {
      // Ensure screenshots directory exists
      await FileService.ensureDirectory(CONFIG.screenshotsDir);

      // Ensure metadata directory exists
      const metadataDir = path.join(CONFIG.screenshotsDir, ".metadata");
      await FileService.ensureDirectory(metadataDir);

      // Get all image files
      const files = await fs.readdir(CONFIG.screenshotsDir);
      console.log("All files in directory:", files);

      // Filter out hidden files and directories, match any image extension
      const imageFiles = files.filter(
        (f) =>
          !f.startsWith(".") && // Exclude hidden files/dirs
          /\.(png|gif|mp4|jpg|jpeg|webp|heic)$/i.test(f), // Match any common image format
      );
      console.log("Filtered image files:", imageFiles);

      if (imageFiles.length === 0) {
        console.log("No images found in", CONFIG.screenshotsDir);
      }

      const captureFiles: CaptureFile[] = [];
      for (const file of imageFiles) {
        console.log("Processing file:", file);
        const filePath = path.join(CONFIG.screenshotsDir, file);
        const metadataPath = path.join(metadataDir, `${file}.json`);

        let stats: { size: number; mtime: Date; birthtime: Date };
        try {
          stats = await fs.stat(filePath);
          console.log("File stats:", { size: stats.size, mtime: stats.mtime });
        } catch (error) {
          console.error("Failed to stat file:", file, error);
          continue;
        }

        let data: CapturedData;
        try {
          const content = await fs.readFile(metadataPath, "utf-8");
          const parsedData = JSON.parse(content);

          // Handle legacy data format
          if (!parsedData.metadata) {
            data = {
              content: {
                text: parsedData.clipboardText || null,
                html: parsedData.browserTabHTML || null,
                screenshot: parsedData.screenshotPath || `file://${filePath}`,
              },
              source: {
                app: parsedData.activeAppName || null,
                bundleId: parsedData.activeAppBundleId || null,
                url: parsedData.activeURL || null,
                window: parsedData.frontAppName || null,
              },
              metadata: {
                timestamp: parsedData.timestamp || stats.birthtime.toISOString(),
                comment: parsedData.comment,
              },
            };
          } else {
            data = parsedData;
          }
        } catch {
          // If no metadata exists, create new metadata
          const { appName, bundleId } = await WindowService.getActiveAppInfo();
          const timestamp = stats.birthtime.toISOString();
          data = {
            content: {
              text: null,
              html: null,
              screenshot: `file://${filePath}`,
            },
            source: {
              app: appName,
              bundleId: bundleId,
              url: null,
              window: appName,
            },
            metadata: {
              timestamp: timestamp,
            },
          };
          await FileService.saveJSON(metadataPath, data);
        }

        captureFiles.push({
          path: filePath,
          metadataPath,
          data,
          timestamp: new Date(data.metadata.timestamp),
        });
      }

      // Sort by timestamp, newest first
      captureFiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setCaptures(captureFiles);
    } catch (error) {
      console.error("Failed to load screenshots:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Screenshots",
        message: `Make sure ${CONFIG.screenshotsDir} exists and is accessible`,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Watch for file changes in the screenshots directory
  useEffect(() => {
    const watcher = watch(CONFIG.screenshotsDir, (eventType, filename) => {
      if (filename && !filename.startsWith(".")) {
        console.log("File change detected:", eventType, filename);
        loadCaptures();
      }
    });

    return () => {
      watcher.close();
    };
  }, [loadCaptures]);

  // Initial load
  useEffect(() => {
    loadCaptures();
  }, [loadCaptures]);

  const preferenceActions = (
    <>
      <Action.OpenInBrowser
        title="Change Screenshots Directory"
        icon="🖼️"
        url="raycast://preferences/extensions/capture?preferences=screenshotsDirectory"
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        onOpen={loadCaptures}
      />
      <Action.OpenInBrowser
        title="Change Capture Directory"
        icon="📁"
        url="raycast://preferences/extensions/capture?preferences=captureDirectory"
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onOpen={loadCaptures}
      />
      <Action
        title="Refresh Screenshots"
        icon="↻"
        onAction={loadCaptures}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </>
  );

  if (captures.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          title="No screenshots found"
          description={`Make sure your screenshots are saved to ${CONFIG.screenshotsDir}`}
          actions={<ActionPanel>{preferenceActions}</ActionPanel>}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search screenshots..." isShowingDetail>
      {captures.map((capture) => {
        const date = new Date(capture.data.metadata.timestamp);
        const dateString = date.toLocaleDateString([], { month: "short", day: "numeric" });

        return (
          <List.Item
            key={capture.path}
            icon="🖼️"
            title={path.basename(capture.path)}
            subtitle={capture.data.metadata.comment?.slice(0, 50)}
            accessories={[{ text: dateString }, ...(capture.data.metadata.comment ? [{ icon: "💭" }] : [])]}
            detail={<CaptureDetail data={capture.data} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Add or Edit Comment"
                    target={
                      <CommentForm data={capture.data} filePath={capture.metadataPath} onCommentSaved={loadCaptures} />
                    }
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action.Open
                    title="Open Screenshot"
                    target={capture.path}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>{preferenceActions}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
