import { readdir, stat } from "fs/promises";
import { join } from "path";
import { useState, useEffect } from "react";
import { Folder } from "../type";
import { showFailureToast } from "@raycast/utils";

export interface ImageFile {
  path: string;
  name: string;
  type: string;
}

export function useImages(folders: Folder[]) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const validExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico"];

  useEffect(() => {
    let isMounted = true;
    async function loadImages() {
      const loadedImages: ImageFile[] = [];

      async function scanDirectory(dirPath: string, recursive: boolean) {
        try {
          const files = await readdir(dirPath);
          for (const file of files) {
            if (!isMounted) return;
            const fullPath = join(dirPath, file);
            const fileStat = await stat(fullPath);

            if (fileStat.isDirectory() && recursive) {
              await scanDirectory(fullPath, recursive);
            } else if (fileStat.isFile()) {
              const dotIndex = file.lastIndexOf(".");
              const ext = dotIndex >= 0 ? file.toLowerCase().slice(dotIndex) : "";
              if (validExtensions.includes(ext)) {
                loadedImages.push({
                  path: fullPath,
                  name: file,
                  type: ext.slice(1),
                });
              }
            }
          }
        } catch (error) {
          showFailureToast(error, { title: "Could not read directory" });
        }
      }

      for (const folder of folders) {
        await scanDirectory(folder.path, folder.recursive);
      }

      if (isMounted) {
        setImages(loadedImages);
        setIsLoading(false);
      }
    }

    loadImages();

    return () => {
      isMounted = false;
    };
  }, [folders]);

  return { images, isLoading };
}
