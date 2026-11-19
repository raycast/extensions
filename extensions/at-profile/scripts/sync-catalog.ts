/**
 * Refresh src/catalog/sherlock.json from Sherlock's site list, probing every site from this machine to grade how far
 * its check can be trusted, then refresh the bundled favicons. Run with `npm run sync-catalog`; it takes a minute or
 * so. CONCURRENCY sets how many sites are probed at once (default 8). Run it from a normal connection: under a
 * sandbox or a throttled network most sites come back unverified.
 */
import { writeFileSync } from "node:fs";
import { buildCatalog } from "../src/catalog/sync";
import { syncFavicons } from "./favicons";

const OUT = new URL("../src/catalog/sherlock.json", import.meta.url);

const catalog = await buildCatalog({
  concurrency: Number(process.env.CONCURRENCY ?? 8),
  onProgress: (done, total) => {
    if (done % 50 === 0 || done === total) console.error(`${done} of ${total} probed`);
  },
});
const tally = catalog.sites.reduce<Record<string, number>>((counts, site) => {
  counts[site.reliability] = (counts[site.reliability] ?? 0) + 1;
  return counts;
}, {});
console.error(tally, `${catalog.sites.filter((site) => site.platform).length} on a known platform`);
writeFileSync(OUT, `${JSON.stringify(catalog, null, 2)}\n`);
console.error(`Wrote ${OUT.pathname}`);
await syncFavicons();
