import { type FC, useEffect, useState } from "react";
import type { DiskUsageSend } from "../machines/disk-usage-machine";
import type { FileNode } from "../types";
import { getGlobalSearchIndex } from "../utils/storage";
import { FileSection } from "./FileSection";

export const SearchResultsView: FC<{
  query: string;
  isProcessingDeletion: boolean;
  send: DiskUsageSend;
}> = ({ query, isProcessingDeletion, send }) => {
  const [items, setItems] = useState<FileNode[]>([]);

  useEffect(() => {
    getGlobalSearchIndex().then((all) => {
      const lowerQuery = query.toLowerCase();
      const filtered = all.filter((node) => node.name.toLowerCase().includes(lowerQuery));
      setItems(filtered);
    });
  }, [query]);

  return (
    <FileSection title={`Search Results "${query}"`} items={items} isDeleting={isProcessingDeletion} send={send} />
  );
};
