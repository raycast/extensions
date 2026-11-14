import { useEffect, useMemo, useState } from "react";
import { getPdfThumbnail } from "../lib/pdfThumbnail";
import { Card, Pocket } from "../types";

/**
 * Maps a PDF Card's path to its generated PNG preview path, filled in progressively so the
 * grid renders immediately and previews appear as PDFium works through them.
 */
export function usePdfThumbnails(pockets: Pocket[] | undefined): Record<string, string> {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const pdfCards = useMemo(
    () => (pockets ?? []).flatMap((pocket) => pocket.cards).filter((card: Card) => card.extension === "pdf"),
    [pockets],
  );
  const pdfKey = pdfCards.map((card) => `${card.path}:${card.mtimeMs}`).join("|");

  useEffect(() => {
    if (pdfCards.length === 0) return;
    let cancelled = false;

    (async () => {
      for (const card of pdfCards) {
        if (cancelled) break;
        const thumbnailPath = await getPdfThumbnail(card.path, card.mtimeMs);
        if (!cancelled && thumbnailPath) {
          setThumbnails((previous) =>
            previous[card.path] === thumbnailPath ? previous : { ...previous, [card.path]: thumbnailPath },
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // pdfKey collapses the Card list into a value that only changes when a PDF is added,
    // removed, or edited — re-running on every `pockets` identity change would restart
    // rendering needlessly.
  }, [pdfKey]);

  return thumbnails;
}
