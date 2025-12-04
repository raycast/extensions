import { getSelectedFinderItems } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback } from "react";
import { lstatSync } from "fs";

export default function useSelectedFile() {
  const callback = useCallback(async () => {
    const items = await getSelectedFinderItems();
    if (items.length > 1) {
      throw Error("Quick extract only accepts one file");
    }

    const firstItem = items[0];
    if (!lstatSync(firstItem.path).isFile()) {
      throw Error("Selected item in Finder needs to be a file");
    }

    if (!(firstItem.path.endsWith(".pdf") || firstItem.path.endsWith(".jpg") || firstItem.path.endsWith(".png"))) {
      throw Error("File must be a PDF, JPG, or PNG");
    }

    return firstItem.path;
  }, []);

  return usePromise(callback);
}
