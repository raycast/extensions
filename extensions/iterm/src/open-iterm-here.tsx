import { useEffect, useState } from "react";
import { ItermCommand } from "./core/iterm-command";
import { ErrorToast } from "./core/error-toast";
import { useSelectedItems } from "./core/use-selected-items";
import { useFinderPath } from "./core/use-finder-path";
import { FileSystemItem } from "@raycast/api";
import { dirname } from "path";
import { statSync } from "fs";

const getItemPath = (item: FileSystemItem) => {
  const stats = statSync(item.path);
  return stats.isDirectory() ? item.path : dirname(item.path);
};

export default function Command() {
  const { items, error: itemsError } = useSelectedItems();
  const { path: finderPath, error: finderError } = useFinderPath();
  const [paths, setPaths] = useState(new Set<string>());

  useEffect(() => {
    if (items.length) {
      const newPaths = new Set<string>();
      items.forEach((item) => newPaths.add(getItemPath(item)));
      setPaths(newPaths);
    }
  }, [items]);

  useEffect(() => {
    if (itemsError && finderPath.length) {
      setPaths(new Set([finderPath]));
    }
  }, [itemsError, finderPath]);

  if (itemsError && finderError) return <ErrorToast error={finderError} />;
  if (paths.size)
    return (
      <>
        {[...paths].map((path) => (
          <ItermCommand
            key={path}
            command={`cd "${path}"`}
            loadingMessage="Getting selected file(s)..."
            location="new-window"
          />
        ))}
      </>
    );
  return null;
}
