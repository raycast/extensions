import { useEffect, useMemo, useState } from "react";
import { getPdfThumbnail } from "../lib/pdfThumbnail";
import { ImageFile } from "../types";

// Maps a PDF's absolute path to its generated PNG thumbnail path, filled in progressively.
export function usePdfThumbnails(images: ImageFile[]): Record<string, string> {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const pdfFiles = useMemo(() => images.filter((image) => image.extension === "pdf"), [images]);
  const pdfKey = pdfFiles.map((file) => `${file.path}:${file.mtimeMs}`).join("|");

  useEffect(() => {
    if (pdfFiles.length === 0) return;
    let cancelled = false;

    (async () => {
      for (const file of pdfFiles) {
        if (cancelled) break;
        const thumbnailPath = await getPdfThumbnail(file.path, file.mtimeMs);
        if (!cancelled && thumbnailPath) {
          setThumbnails((previous) =>
            previous[file.path] === thumbnailPath ? previous : { ...previous, [file.path]: thumbnailPath },
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfKey]);

  return thumbnails;
}
