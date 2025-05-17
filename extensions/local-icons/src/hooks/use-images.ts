import { readdir, stat } from "fs/promises";
import { join } from "path";
import { useState, useEffect } from "react";
import { Folder } from "../type";

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
    async function loadImages() {
      const loadedImages: ImageFile[] = [];

      async function scanDirectory(dirPath: string, recursive: boolean) {
        try {
          const files = await readdir(dirPath);
          for (const file of files) {
            const fullPath = join(dirPath, file);
            const fileStat = await stat(fullPath);

            if (fileStat.isDirectory() && recursive) {
              await scanDirectory(fullPath, recursive);
            } else if (fileStat.isFile()) {
              const ext = file.toLowerCase().slice(file.lastIndexOf("."));
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
          console.error(`Error reading directory ${dirPath}:`, error);
        }
      }

      for (const folder of folders) {
        await scanDirectory(folder.path, folder.recursive);
      }

      setImages(loadedImages);
      setIsLoading(false);
    }

    loadImages();
  }, [folders]);

  return { images, isLoading };
}
