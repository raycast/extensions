import { getSelectedFinderItems } from "@raycast/api";
import _cacheDir from "cachedir";
import * as fs from "fs";
import * as path from "path";
import { fileState$ } from "../managers/fileManager";
import { getFileType } from "./ffmpeg/fileType";
import { FileType } from "../type/file";

function autoCreateDir(dirPath: string) {
  // create cache dir if not exits
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export const cacheDir = _cacheDir("raycast-ffmpeg");
autoCreateDir(cacheDir);

export const cacheDirForPreviewImage = path.join(cacheDir, "preview-image-cache");
autoCreateDir(cacheDirForPreviewImage);

export async function refreshSelectedFiles(options?: { filterFileType: boolean }) {
  const { filterFileType = false } = options || {};
  if (filterFileType) {
    fileState$.batch(() => {
      fileState$.loadingDesc.set(
        `Filtering file type...starting\n\nFile filtering is being conducted in strict mode, please allow some time for this process to complete.`
      );
      fileState$.loading.set(true);
    });
  } else {
    fileState$.loading.set(true);
  }

  try {
    const items = await getSelectedFinderItems();
    const fileCount = items.length;

    let processIndex = 0;
    const files: string[] = [];

    while (processIndex < fileCount) {
      const item = items[processIndex];
      let filePath = "";
      if (fs.existsSync(item.path)) {
        filePath = item.path;
      } else {
        const filePathInVolumes = path.join("/Volumes", item.path);
        if (fs.existsSync(filePathInVolumes)) {
          filePath = filePathInVolumes;
        }
      }

      if (filePath) {
        if (filterFileType) {
          const { type } = getFileType(filePath);
          if (type !== FileType.other) {
            files.push(filePath);
          }
        } else {
          files.push(filePath);
        }
      }

      await new Promise((resolve) =>
        setImmediate(() => {
          fileState$.loadingDesc.set(
            `Filtering file type... (${
              processIndex + 1
            }/${fileCount})\n\nFile filtering is being conducted in strict mode, please allow some time for this process to complete.`
          );
          resolve(1);
        })
      );

      processIndex += 1;
    }

    fileState$.filePaths.set(files);
  } catch (e) {
    console.error(e);
  } finally {
    fileState$.batch(() => {
      fileState$.loadingDesc.set("");
      fileState$.loading.set(false);
    });
  }
}
