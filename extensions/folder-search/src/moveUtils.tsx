import { confirmAlert, getSelectedFinderItems, showToast, Toast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "path";
import fse from "fs-extra";
import { log } from "./utils";

export async function moveFinderItems(
  destinationFolder: string
): Promise<{ success: boolean; movedCount: number; skippedCount: number }> {
  try {
    log("debug", "moveFinderItems", "Starting move operation", {
      destinationFolder,
      timestamp: new Date().toISOString(),
    });

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

        const exists = await fse.pathExists(destinationFile);
        if (exists) {
          log("debug", "moveFinderItems", "File exists at destination", {
            file: destinationFile,
            timestamp: new Date().toISOString(),
          });

          const overwrite = await confirmAlert({
            title: "Overwrite the existing file?",
            message: `${sourceFileName} already exists in ${destinationFolder}`,
          });

          if (overwrite) {
            if (item.path === destinationFile) {
              log("debug", "moveFinderItems", "Source and destination are the same", {
                file: item.path,
                timestamp: new Date().toISOString(),
              });
              await showFailureToast({ title: "The source and destination file are the same" });
              skippedCount++;
              continue;
            }
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
            await showFailureToast({ title: "Cancelling move for " + sourceFileName });
            skippedCount++;
            continue;
          }
        } else {
          await fse.move(item.path, destinationFile);
          movedCount++;
          log("debug", "moveFinderItems", "File moved successfully", {
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
        await showFailureToast(e, { title: "Error moving file" });
        return { success: false, movedCount, skippedCount };
      }
    }

    log("debug", "moveFinderItems", "Move operation completed", {
      movedCount,
      skippedCount,
      destinationFolder,
      timestamp: new Date().toISOString(),
    });

    if (movedCount === 0) {
      await showFailureToast({ title: "No files were moved" });
      return { success: false, movedCount: 0, skippedCount };
    } else if (skippedCount > 0) {
      await showFailureToast({
        title: `Moved ${movedCount} item(s) to ${path.basename(destinationFolder)}, skipped ${skippedCount} item(s)`,
      });
    } else {
      await showToast({
        title: "Successfully moved to folder",
        message: `Moved ${movedCount} ${movedCount === 1 ? "file" : "files"} to ${path.basename(destinationFolder)}`,
      });
    }

    return { success: movedCount > 0, movedCount, skippedCount };
  } catch (error) {
    log("error", "moveFinderItems", "Unexpected error in move operation", {
      error,
      destinationFolder,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}
