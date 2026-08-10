import { useState, useEffect } from "react";
import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { basename, extname } from "path";
import { FileItem, RenameRule, applyRulesToItem } from "./rules";
import { stat } from "fs/promises";

export function useFileSelection() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const items = await getSelectedFinderItems();
        const fileItems: FileItem[] = await Promise.all(
          items.map(async (item) => {
            const stats = await stat(item.path);
            const name = basename(item.path);
            const ext = stats.isDirectory() ? "" : extname(item.path);
            const base = stats.isDirectory() ? name : basename(item.path, ext);

            return {
              originalPath: item.path,
              name: base,
              extension: ext,
              isDirectory: stats.isDirectory(),
            };
          }),
        );
        setFiles(fileItems);
      } catch (e) {
        showToast({ style: Toast.Style.Failure, title: "Failed to read files", message: String(e) });
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  return { files, loading };
}

export function usePreview(files: FileItem[], rules: RenameRule[]) {
  const [previewFiles, setPreviewFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    const next = files.map((file, index) => {
      const { name, extension } = applyRulesToItem(file, rules, index);
      const newFullName = name + extension;
      return { ...file, newName: newFullName };
    });
    setPreviewFiles(next);
  }, [files, rules]);

  return previewFiles;
}
