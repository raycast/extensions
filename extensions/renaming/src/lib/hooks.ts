import { useState, useEffect } from "react";
import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { FileItem, RenameRule, applyRulesToItem } from "./rules";
import { getFileInfo } from "./files";

/**
 * The whole Finder selection, files and folders alike. Callers narrow it to
 * what they act on with `filterByScope` from `./selection`.
 */
export function useFileSelection() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const items = await getSelectedFinderItems();
        const infos = await Promise.all(items.map((item) => getFileInfo(item.path)));
        const fileItems: FileItem[] = infos.map((info) => ({
          originalPath: info.path,
          name: info.baseName,
          extension: info.extension,
          isDirectory: info.isDirectory,
        }));
        setFiles(fileItems);
      } catch (e) {
        showToast({ style: Toast.Style.Failure, title: "Failed to read Finder selection", message: String(e) });
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
