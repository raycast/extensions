import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { fetchFonts, fetchPairs, Font, FontPair } from "./api";

export interface Catalog {
  fonts: Font[];
  pairs: FontPair[];
}

// Secondary data only links fonts and pairs, so its failure is logged instead of shown: one toast is enough.
function logError(error: Error) {
  console.error(error);
}

/**
 * Loads the font catalogue and the curated pairings, which the commands use to link fonts and pairs. Only the
 * command's `primary` data reports failures with a toast.
 */
export function useCatalog(primary: "fonts" | "pairs") {
  const fonts = useCachedPromise(fetchFonts, [], {
    keepPreviousData: true,
    ...(primary === "fonts"
      ? { failureToastOptions: { title: "Could not load Fontshare fonts" } }
      : { onError: logError }),
  });
  const pairs = useCachedPromise(fetchPairs, [], {
    keepPreviousData: true,
    ...(primary === "pairs"
      ? { failureToastOptions: { title: "Could not load Fontshare pairings" } }
      : { onError: logError }),
  });
  const catalog = useMemo<Catalog>(
    () => ({ fonts: fonts.data ?? [], pairs: pairs.data ?? [] }),
    [fonts.data, pairs.data],
  );

  return { fonts, pairs, catalog };
}
