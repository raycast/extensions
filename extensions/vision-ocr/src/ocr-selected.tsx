import { getSelectedFinderItems } from "@raycast/api";
import { useEffect, useState } from "react";
import { VisionOCRResult } from "./ocr";

export default function Command() {
  const [paths, set_paths] = useState<string[]>();

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => set_paths(items.map((item) => item.path)))
      .catch(() => set_paths([]));
  }, []);

  return <VisionOCRResult paths={paths} />;
}
