import { useEffect, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { DriveNode, listFolderCached } from "./cli";
import { isDemo } from "./demo";
import { FolderContents } from "../components/NodeItem";

/**
 * Loads the contents of the folder under the selection, for the detail panel.
 * Waits until the selection rests for a moment, since every CLI call takes a few seconds.
 * The result lands in the same cache as FolderView, so opening that folder is then instant.
 */
export function useSelectedFolder(nodes: DriveNode[] | undefined) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settledPath, setSettledPath] = useState<string>();

  const selected = nodes?.find((n) => n.uid === selectedId) ?? nodes?.[0];
  const folderPath = selected?.type === "folder" ? selected.path : undefined;

  useEffect(() => {
    const timer = setTimeout(() => setSettledPath(folderPath), 400);
    return () => clearTimeout(timer);
  }, [folderPath]);

  const { data, isLoading } = useCachedPromise(listFolderCached, [settledPath ?? "", isDemo() ? "demo" : "live"], {
    execute: Boolean(settledPath) && settledPath === folderPath,
    keepPreviousData: false,
  });

  const contents: FolderContents | undefined =
    folderPath && settledPath === folderPath
      ? { nodes: data, isLoading }
      : folderPath
        ? { isLoading: true }
        : undefined;

  return { selectedUid: selected?.uid, contents, onSelectionChange: setSelectedId };
}
