import { useState, useEffect, useCallback } from "react";
import { utils, CONFIG } from "./utils";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { watch } from "node:fs";
import { CaptureList, type CaptureFile } from "./components/CaptureList";

const getFileStats = async (directory: string, file: string) => {
  const filePath = path.join(directory, file);
  try {
    const stats = await fs.stat(filePath);
    return { file, path: filePath, stats };
  } catch (error) {
    console.error("Failed to stat file:", file, error);
    return null;
  }
};

export default function Command() {
  const [captures, setCaptures] = useState<CaptureFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCaptures = useCallback(async () => {
    setIsLoading(true);
    try {
      await utils.ensureDirectory(CONFIG.directories.screenshots);

      const allFiles = await fs.readdir(CONFIG.directories.screenshots);
      console.debug("All files in directory:", allFiles);

      const imageFiles = allFiles.filter(utils.isImageFile);
      console.debug("Filtered image files:", imageFiles);

      if (imageFiles.length === 0) {
        console.debug("No images found in", CONFIG.directories.screenshots);
      }

      const fileStats = await Promise.all(imageFiles.map((file) => getFileStats(CONFIG.directories.screenshots, file)));

      const validCaptures = fileStats
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map(({ path: filePath, stats }) => ({
          path: filePath,
          data: {
            id: path.basename(filePath),
            type: "screenshot" as const,
            timestamp: stats.mtime.toISOString(),
            selectedText: null,
            screenshotPath: utils.getFileUrl(filePath),
            activeViewContent: null,
            app: "Screenshot",
            bundleId: null,
            url: null,
            window: null,
            title: null,
          },
          timestamp: stats.mtime,
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.debug("Sorted captures:", validCaptures);
      setCaptures(validCaptures);
    } catch (error) {
      console.error("Failed to load screenshots:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const watcher = watch(CONFIG.directories.screenshots, (eventType, filename) => {
      if (filename && !filename.startsWith(".")) {
        console.debug("File change detected:", eventType, filename);
        loadCaptures();
      }
    });

    return () => {
      watcher.close();
    };
  }, [loadCaptures]);

  useEffect(() => {
    loadCaptures();
  }, [loadCaptures]);

  return (
    <CaptureList
      captures={captures}
      isLoading={isLoading}
      onRefresh={loadCaptures}
      onCommentSaved={loadCaptures}
      emptyTitle="No screenshots found"
      emptyDescription={`Make sure your screenshots are saved to ${CONFIG.directories.screenshots}`}
    />
  );
}
