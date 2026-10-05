import { useCallback, useEffect, useState } from "react";
import getObsidianFiles from "../helpers/get-obsidian-files";
import { getLocalStorageFiles } from "../helpers/localstorage-files";
import { File } from "../types";

export type FilesHook = {
  files: File[];
  loading: boolean;
  backgroundLoading: boolean;
  updateFile: (file: File) => void;
};

export default function useFiles(): FilesHook {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(true);

  const updateFile = useCallback((updated: File) => {
    setFiles((current) => current.map((file) => (file.fullPath === updated.fullPath ? updated : file)));
  }, []);

  useEffect(() => {
    async function loadFiles() {
      try {
        // Load initial files from localStorage
        const localFiles = await getLocalStorageFiles();
        setFiles(localFiles);
        setLoading(false);

        // Process files and update as they complete
        const scanned = await getObsidianFiles(localFiles, (file) => {
          setFiles((current) =>
            current.some((f) => f.fullPath === file.fullPath)
              ? current.map((f) => (f.fullPath === file.fullPath ? file : f))
              : [...current, file]
          );
        });
        const paths = new Set(scanned.map((file) => file.fullPath));
        setFiles((current) => current.filter((file) => paths.has(file.fullPath)));
      } catch (error) {
        console.error("Error loading files:", error);
      } finally {
        setLoading(false);
        setBackgroundLoading(false);
      }
    }

    loadFiles();
  }, []);

  return {
    files,
    loading,
    backgroundLoading,
    updateFile,
  };
}
