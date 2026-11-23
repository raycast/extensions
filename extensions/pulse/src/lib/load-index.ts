// The catalog and pair directory on disk, refreshed in the background once a day.
// Shared by Search Symbol and the AI tools, which run in the same support directory.
import { environment } from "@raycast/api";
import { CatalogStore } from "./catalog";
import { SymbolIndex } from "./search";

export const store = new CatalogStore(environment.supportPath);

export async function loadIndex(): Promise<SymbolIndex> {
  const [catalog, pairs] = await Promise.all([store.loadCatalog(), store.loadPairs()]);
  let document = catalog.value;
  let directory = pairs.value;
  const refreshes: Promise<void>[] = [];
  if (store.isStale(catalog)) {
    refreshes.push(
      store.refreshCatalog(document).then((fresh) => {
        document = fresh;
      }),
    );
  }
  if (store.isStale(pairs)) {
    refreshes.push(
      store.refreshPairs().then((fresh) => {
        directory = fresh;
      }),
    );
  }
  if (!document) {
    // Nothing to search yet: wait for the first download.
    const results = await Promise.allSettled(refreshes);
    const failed = results.find((result) => result.status === "rejected");
    if (!document) throw failed?.reason ?? new Error("The symbol list could not be downloaded.");
    return new SymbolIndex(document, directory);
  }
  if (refreshes.length) {
    // The copy in hand answers now; a newer one is used from the next launch.
    void Promise.allSettled(refreshes);
  }
  return new SymbolIndex(document, directory);
}

/** Downloads the newest catalog and pair directory now, whatever their age. */
export async function updateCatalog(): Promise<void> {
  const current = (await store.loadCatalog()).value;
  await Promise.all([store.refreshCatalog(current), store.refreshPairs()]);
}
