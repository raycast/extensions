import { useEffect, useState } from "react";
import type { Item } from "$lib/types";
import { isNavigableDirectory } from "$lib/item-behavior";
import { getPreviewMarkdown } from "./file-preview";
import { generateFolderTree } from "./folder-tree";

export function useItemPreview(entry: Item) {
  const [preview, setPreview] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setPreview(undefined);

    (async () => {
      if (isNavigableDirectory(entry)) {
        const r = await generateFolderTree(entry.path);
        if (!cancelled) {
          setPreview(r.markdown);
        }
      } else {
        const md = await getPreviewMarkdown(entry);
        if (!cancelled) {
          setPreview(md);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entry.path, entry.fsContentChangeDate, entry.size, entry.contentType, entry.name]);

  return preview;
}
