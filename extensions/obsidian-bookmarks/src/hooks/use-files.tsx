import { useEffect, useState } from "react";
import getObsidianFiles from "../helpers/get-obsidian-files";
import { getLocalStorageFiles } from "../helpers/localstorage-files";
import { File } from "../types";

export type FilesHook = {
  files: File[];
  loading: boolean;
  backgroundLoading: boolean;
};

export default function useFiles(): FilesHook {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(true);

  useEffect(() => {
    async function loadFiles() {
      try {
        // Load initial files from localStorage
        const localFiles = await getLocalStorageFiles();
        setFiles(localFiles);
        setLoading(false);

        // Process files and update as they complete
        const loadedFiles: File[] = [];
        await getObsidianFiles(localFiles, (file) => {
          loadedFiles.push(file);
          setFiles([...loadedFiles]);
        });
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
  };
}
