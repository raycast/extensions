import { getSelectedFinderItems } from "@raycast/api";
import { useEffect, useState } from "react";
import { FileSongForm } from "./components/FileSongForm";

export default function Command() {
  const [initialFilePath, setInitialFilePath] = useState<string | undefined>(
    undefined,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => {
        if (items.length > 0) {
          setInitialFilePath(items[0].path);
        }
      })
      .catch(() => {
        // Finder not active or no selection — fine, form opens empty
      })
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return <FileSongForm initialFilePath={initialFilePath} />;
}
