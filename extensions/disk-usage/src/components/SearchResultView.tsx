import { useMemo, type FC } from "react";
import type { FileNode, FileSystemIndex } from "../types";
import { FileSection } from "./FileSection";
import { DiskUsageSend } from "../machines/disk-usage-machine";

export const SearchResultsView: FC<{
  fsIndex: FileSystemIndex;
  query: string;
  isProcessingDeletion: boolean;
  send: DiskUsageSend;
}> = ({ fsIndex, query, isProcessingDeletion, send }) => {
  const filteredItems = useMemo(() => {
    const allFiles: FileNode[] = [];
    const lowerQuery = query.toLowerCase();

    Object.values(fsIndex).forEach((snapshot) => {
      snapshot.accessible.forEach((node) => {
        if (node.name.toLowerCase().includes(lowerQuery)) {
          allFiles.push(node);
        }
      });
    });

    return allFiles.sort((a, b) => b.bytes - a.bytes).slice(0, 100);
  }, [fsIndex, query]);

  return (
    <FileSection
      title={`Search Results "${query}"`}
      items={filteredItems}
      isDeleting={isProcessingDeletion}
      send={send}
    />
  );
};
