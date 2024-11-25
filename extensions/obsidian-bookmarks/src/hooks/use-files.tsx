import { useCallback, useEffect, useState } from "react";
import getObsidianFiles from "../helpers/get-obsidian-files";
import { getLocalStorageFiles } from "../helpers/localstorage-files";
import { File, unique } from "../types";

export type FilesHook = {
  files: File[];
  loading: boolean;
  backgroundLoading: boolean;
};

export default function useFiles(): FilesHook {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(true);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      setFiles((orig) => {
        const unsorted = unique([...orig, ...newFiles]);
        const sorted = unsorted.sort((a, b) => a.attributes.title.localeCompare(b.attributes.title));
        return sorted;
      });
    },
    [setFiles]
  );

  useEffect(() => {
    let mounted = true;

    const loadInitialFiles = async () => {
      try {
        const localFiles = await getLocalStorageFiles();
        if (mounted) {
          addFiles(localFiles);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading local storage files:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const loadObsidianFiles = async () => {
      try {
        const obsidianFiles = await getObsidianFiles();
        if (mounted) {
          addFiles(obsidianFiles);
        }
      } catch (error) {
        console.error("Error loading Obsidian files:", error);
      } finally {
        if (mounted) {
          setBackgroundLoading(false);
        }
      }
    };

    loadInitialFiles();
    loadObsidianFiles();

    return () => {
      mounted = false;
    };
  }, [addFiles]);

  return {
    files,
    loading,
    backgroundLoading,
  };
}
