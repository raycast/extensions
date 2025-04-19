import { confirmAlert, getSelectedFinderItems, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "path";
import fse from "fs-extra";

export async function moveFinderItems(
  destinationFolder: string
): Promise<{ success: boolean; movedCount: number; skippedCount: number }> {
  try {
    console.debug(`[FolderSearch] Starting move operation:`, {
      destinationFolder,
      component: "moveFinderItems",
      timestamp: new Date().toISOString(),
    });

    const selectedItems = await getSelectedFinderItems();
    console.debug(`[FolderSearch] Got selected Finder items:`, {
      count: selectedItems.length,
      items: selectedItems.map((item) => item.path),
      component: "moveFinderItems",
      timestamp: new Date().toISOString(),
    });

    if (selectedItems.length === 0) {
      console.debug(`[FolderSearch] No Finder items selected:`, {
        component: "moveFinderItems",
        timestamp: new Date().toISOString(),
      });
      await showFailureToast({ title: "No Finder selection to move" });
      return { success: false, movedCount: 0, skippedCount: 0 };
    }

    let movedCount = 0;
    let skippedCount = 0;

    for (const item of selectedItems) {
      const sourceFileName = path.basename(item.path);
      const destinationFile = path.join(destinationFolder, sourceFileName);

      try {
        console.debug(`[FolderSearch] Processing item:`, {
          source: item.path,
          destination: destinationFile,
          component: "moveFinderItems",
          timestamp: new Date().toISOString(),
        });

        const exists = await fse.pathExists(destinationFile);
        if (exists) {
          console.debug(`[FolderSearch] File exists at destination:`, {
            file: destinationFile,
            component: "moveFinderItems",
            timestamp: new Date().toISOString(),
          });

          const overwrite = await confirmAlert({
            title: "Overwrite the existing file?",
            message: sourceFileName + " already exists in " + destinationFolder,
          });

          if (overwrite) {
            if (item.path === destinationFile) {
              console.debug(`[FolderSearch] Source and destination are the same:`, {
                file: item.path,
                component: "moveFinderItems",
                timestamp: new Date().toISOString(),
              });
              await showFailureToast({ title: "The source and destination file are the same" });
              skippedCount++;
              continue;
            }
            await fse.move(item.path, destinationFile, { overwrite: true });
            movedCount++;
            console.debug(`[FolderSearch] File moved with overwrite:`, {
              source: item.path,
              destination: destinationFile,
              component: "moveFinderItems",
              timestamp: new Date().toISOString(),
            });
          } else {
            console.debug(`[FolderSearch] User cancelled overwrite:`, {
              file: sourceFileName,
              component: "moveFinderItems",
              timestamp: new Date().toISOString(),
            });
            await showFailureToast({ title: "Cancelling move for " + sourceFileName });
            skippedCount++;
            continue;
          }
        } else {
          await fse.move(item.path, destinationFile);
          movedCount++;
          console.debug(`[FolderSearch] File moved successfully:`, {
            source: item.path,
            destination: destinationFile,
            component: "moveFinderItems",
            timestamp: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error(`[FolderSearch] Error moving file:`, {
          error: e,
          source: item.path,
          destination: destinationFile,
          component: "moveFinderItems",
          timestamp: new Date().toISOString(),
        });
        await showFailureToast(e, { title: "Error moving file" });
        return { success: false, movedCount, skippedCount };
      }
    }

    console.debug(`[FolderSearch] Move operation completed:`, {
      movedCount,
      skippedCount,
      destinationFolder,
      component: "moveFinderItems",
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
    console.error(`[FolderSearch] Unexpected error in move operation:`, {
      error,
      destinationFolder,
      component: "moveFinderItems",
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}
