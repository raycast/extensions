import { FileSystemItem, getSelectedFinderItems } from "@raycast/api";
import { useEffect, useState } from "react";

interface Result {
  items: FileSystemItem[];
  error?: Error;
}

export const useSelectedItems = (): Result => {
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    getSelectedFinderItems()
      .then((selected) => (selected.length === 0 ? setError(new Error("No files selected")) : setItems(selected)))
      .catch((error) => setError(error));
  }, []);

  return { items, error };
};
