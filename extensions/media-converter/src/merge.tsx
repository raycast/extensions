import { useEffect, useState } from "react";
import { getSelectedFinderItems } from "@raycast/api";
import { MergeForm } from "./components/MergeForm";

export default function Command() {
  const [initialFiles, setInitialFiles] = useState<string[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const items = await getSelectedFinderItems();
        setInitialFiles(items.map((i) => i.path));
      } catch {
        setInitialFiles([]);
      }
    })();
  }, []);

  if (initialFiles === null) {
    return <MergeForm initialFiles={[]} />;
  }

  return <MergeForm initialFiles={initialFiles} />;
}
