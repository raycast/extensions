/**
 * Download favicons for the built-in apps and the default Find Profile sites into assets/favicons, and list them in
 * src/catalog/favicons.json, so those rows never wait on the network. Run with `npm run sync-favicons`;
 * `npm run sync-catalog` runs it too.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { findCatalogSiteByName } from "../src/catalog";
import { BUILT_IN_ALIASES, DEFAULT_SEARCH_SITES } from "../src/catalog/defaults";
import { downloadFavicon, faviconKey } from "../src/helpers/favicons";
import { defaultApps } from "../src/utils/default-apps";

const ASSETS = new URL("../assets/favicons/", import.meta.url);
const LIST = new URL("../src/catalog/favicons.json", import.meta.url);

export async function syncFavicons(): Promise<string[]> {
  const templates = [
    ...defaultApps.map((app) => app.urlTemplate),
    ...DEFAULT_SEARCH_SITES.filter((name) => !BUILT_IN_ALIASES[name]).flatMap((name) => {
      const template = findCatalogSiteByName(name)?.urlTemplate;
      return template ? [template] : [];
    }),
  ];
  const keys = [...new Set(templates.flatMap((template) => faviconKey(template) ?? []))].sort();
  mkdirSync(ASSETS, { recursive: true });

  const saved: string[] = [];
  for (const key of keys) {
    const bytes = await downloadFavicon(key, fetch);
    if (!bytes) {
      console.error(`No favicon for ${key}`);
      continue;
    }
    writeFileSync(new URL(`${key}.png`, ASSETS), bytes);
    saved.push(key);
  }
  writeFileSync(LIST, `${JSON.stringify(saved, null, 2)}\n`);
  console.error(`Saved ${saved.length} of ${keys.length} favicons`);
  return saved;
}
