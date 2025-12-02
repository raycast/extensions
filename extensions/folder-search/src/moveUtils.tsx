import {
  confirmAlert,
  getSelectedFinderItems,
  showToast,
  Toast,
  open,
  showHUD,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "path";
import fse from "fs-extra";
import { log } from "./utils";
import { SpotlightSearchPreferences } from "./types";

export async function moveFinderItems(
  destinationFolder: string,
): Promise<{ success: boolean; movedCount: number; skippedCount: number }> {
  try {
    log("debug", "moveFinderItems", "Starting move operation", {
      destinationFolder,
      timestamp: new Date().toISOString(),
    });

    // Get preferences
    const { openFolderAfterMove } = getPreferenceValues<SpotlightSearchPreferences>();

    // Try to get selected items - this will throw if Finder isn't frontmost
    let selectedItems;
    try {
      selectedItems = await getSelectedFinderItems();
    } catch (e) {
      log("debug", "moveFinderItems", "Error getting Finder items", {
        error: e,
        timestamp: new Date().toISOString(),
      });

      await showToast({
        style: Toast.Style.Failure,
        title: "No items selected",
        message: "Please select files in Finder first",
        primaryAction: {
          title: "Open Finder",
          onAction: () => {
            open("file:///System/Library/CoreServices/Finder.app");
          },
        },
      });

      return { success: false, movedCount: 0, skippedCount: 0 };
    }

    log("debug", "moveFinderItems", "Got selected Finder items", {
      count: selectedItems.length,
      items: selectedItems.map((item) => item.path),
      timestamp: new Date().toISOString(),
    });

    if (selectedItems.length === 0) {
      log("debug", "moveFinderItems", "No Finder items selected", {
        timestamp: new Date().toISOString(),
      });
      await showFailureToast({ title: "No files selected to move" });
      return { success: false, movedCount: 0, skippedCount: 0 };
    }

    let movedCount = 0;
    let skippedCount = 0;

    for (const item of selectedItems) {
      const sourceFileName = path.basename(item.path);
      const destinationFile = path.join(destinationFolder, sourceFileName);

      try {
        log("debug", "moveFinderItems", "Processing item", {
          source: item.path,
          destination: destinationFile,
          timestamp: new Date().toISOString(),
        });

        // Check if source and destination are the same before showing overwrite prompt
        if (item.path === destinationFile) {
          log("debug", "moveFinderItems", "Source and destination are the same", {
            file: item.path,
            timestamp: new Date().toISOString(),
          });
          await showFailureToast({ title: "The source and destination file are the same" });
          skippedCount++;
          continue;
        }

        // Check if file exists and prompt for overwrite
        if (await fse.pathExists(destinationFile)) {
          log("debug", "moveFinderItems", "File exists at destination", {
            file: destinationFile,
            timestamp: new Date().toISOString(),
          });

          const overwrite = await confirmAlert({
            title: "Overwrite the existing file?",
            message: `${sourceFileName} already exists in ${path.basename(destinationFolder)}`,
          });

          if (overwrite) {
            await fse.move(item.path, destinationFile, { overwrite: true });
            movedCount++;
            log("debug", "moveFinderItems", "File moved with overwrite", {
              source: item.path,
              destination: destinationFile,
              timestamp: new Date().toISOString(),
            });
          } else {
            log("debug", "moveFinderItems", "User cancelled overwrite", {
              file: sourceFileName,
              timestamp: new Date().toISOString(),
            });
            skippedCount++;
            continue;
          }
        } else {
          await fse.move(item.path, destinationFile);
          movedCount++;
          log("debug", "moveFinderItems", "File moved", {
            source: item.path,
            destination: destinationFile,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (e) {
        log("error", "moveFinderItems", "Error moving file", {
          error: e,
          source: item.path,
          destination: destinationFile,
          timestamp: new Date().toISOString(),
        });
        await showFailureToast({
          title: `Error moving ${sourceFileName}`,
          message: e instanceof Error ? e.message : "Unknown error",
        });
        skippedCount++;
        continue;
      }
    }

    log("debug", "moveFinderItems", "Move operation completed", {
      movedCount,
      skippedCount,
      destinationFolder,
      timestamp: new Date().toISOString(),
    });

    if (movedCount === 0 && skippedCount === 0) {
      await showFailureToast({ title: "No files were moved" });
      return { success: false, movedCount: 0, skippedCount };
    }

    if (movedCount > 0) {
      // Only open the folder if the preference is enabled
      if (openFolderAfterMove) {
        log("debug", "moveFinderItems", "Opening destination folder", {
          destinationFolder,
          timestamp: new Date().toISOString(),
        });
        open(destinationFolder);
      } else {
        log("debug", "moveFinderItems", "Skipping folder open due to preference", {
          destinationFolder,
          timestamp: new Date().toISOString(),
        });
      }

      log("debug", "moveFinderItems", "Showing success HUD", {
        movedCount,
        skippedCount,
        timestamp: new Date().toISOString(),
      });
      await showHUD(
        `Moved ${movedCount} ${movedCount === 1 ? "file" : "files"} to ${path.basename(destinationFolder)}`,
      );
      log("debug", "moveFinderItems", "Success HUD shown", {
        timestamp: new Date().toISOString(),
      });

      return { success: true, movedCount, skippedCount };
    }

    return { success: false, movedCount, skippedCount };
  } catch (error) {
    log("error", "moveFinderItems", "Unexpected error in move operation", {
      error,
      destinationFolder,
      timestamp: new Date().toISOString(),
    });
    await showFailureToast({
      title: "Unexpected error during move operation",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
