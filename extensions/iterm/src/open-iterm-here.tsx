import { useEffect, useState } from "react";
import { ItermCommand } from "./core/iterm-command";
import { ErrorToast } from "./core/error-toast";
import { useSelectedItems } from "./core/use-selected-items";
import { FileSystemItem } from "@raycast/api";
import { dirname } from "path";
import { statSync } from "fs";

const getItemPath = (item: FileSystemItem) => {
  const stats = statSync(item.path);
  return stats.isDirectory() ? item.path : dirname(item.path);
};

export default function Command() {
  const { items, error } = useSelectedItems();
  const [paths, setPaths] = useState(new Set<string>());

  useEffect(() => {
    if (items.length) {
      const newPaths = new Set<string>();
      items.forEach((item) => newPaths.add(getItemPath(item)));
      setPaths(newPaths);
    }
  }, [items]);

  if (error) return <ErrorToast error={error} />;
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
