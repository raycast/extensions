import { checkProfile } from "../helpers/detect";
import { siteFetch } from "../helpers/transport";
import { fitsPattern } from "../utils/pattern";
import { detectPlatform, PlatformId, platformTarget } from "./platforms";
import { gradeProbe, normalizeSherlock } from "./sherlock";
import type { CatalogSite, CheckTarget } from "./types";

/**
 * Building the catalog from Sherlock's current list: convert it, recognize the sites that run a known platform, and
 * probe every site to grade its check. `npm run sync-catalog` runs this to write the bundled copy; Update Catalog
 * runs it in the extension, from the user's own connection.
 */

const REPO = "sherlock-project/sherlock";
const DATA_PATH = "sherlock_project/resources/data.json";
// Names nobody has. A site whose username rules refuse the first is asked for the second (letters only, 10 long), so
// its "no such profile" answer is still tested
const NONSENSE = ["zq7xk2vplm9wq3t", "zqxkvplmwq"];

// Profile paths Mastodon, Lemmy, Discourse or GitLab sites use. Only these sites are asked which platform they run,
// which keeps the sync from sending four extra requests to every site.
const PLATFORM_SHAPES = [/\/@{profile}\/?$/, /\/u\/{profile}(\/summary)?\/?$/, /^https:\/\/gitlab\./];

export interface Catalog {
  source: { repository: string; commit: string; license: string };
  probedAt: string;
  sites: CatalogSite[];
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await siteFetch(url, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);
  return response.json();
}

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        signal?.throwIfAborted();
        const index = next++;
        results[index] = await work(items[index]);
      }
    }),
  );
  return results;
}

type Converted = ReturnType<typeof normalizeSherlock>[number];

/**
 * @param knownPlatform the platform an earlier probe found, so a retry doesn't ask the site again
 */
async function probeSite(site: Converted, signal?: AbortSignal, knownPlatform?: PlatformId): Promise<CatalogSite> {
  const template = site.urlTemplate;
  const platform =
    knownPlatform ??
    (template && PLATFORM_SHAPES.some((shape) => shape.test(template))
      ? // A site that doesn't answer is graded by its own check; the probe below says how that went
        await detectPlatform(template, { signal }).catch(() => {
          signal?.throwIfAborted();
          return undefined;
        })
      : undefined);
  const onPlatform = platform ? platformTarget(platform, template!) : undefined;
  const target: CheckTarget = onPlatform
    ? { ...onPlatform, usernamePattern: site.usernamePattern ?? onPlatform.usernamePattern }
    : { urlTemplate: template ?? site.homepage, check: site.check, usernamePattern: site.usernamePattern };
  const pattern = target.usernamePattern;
  const nonsenseName = NONSENSE.find((name) => !pattern || fitsPattern(pattern, name)) ?? NONSENSE[0];
  const [known, nonsense] = await Promise.all([
    checkProfile(target, site.knownUsername, { signal }),
    checkProfile(target, nonsenseName, { signal }),
  ]);
  return { ...site, platform, reliability: gradeProbe(known.status, nonsense.status) };
}

/**
 * Download Sherlock's current list and grade every site
 * @param options.onProgress called as sites are probed, with how many are done of how many
 * @throws when the download fails, or when `signal` cancels
 */
export async function buildCatalog(
  options: { concurrency?: number; signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {},
): Promise<Catalog> {
  const { concurrency = 16, signal, onProgress } = options;
  const commit = (await getJson(`https://api.github.com/repos/${REPO}/commits/HEAD`, signal)) as { sha: string };
  const raw = (await getJson(`https://raw.githubusercontent.com/${REPO}/${commit.sha}/${DATA_PATH}`, signal)) as Record<
    string,
    unknown
  >;
  const converted = normalizeSherlock(raw);

  // Only the first pass reports progress: retried sites were already counted, so the counter never runs backwards
  let done = 0;
  const sites = await mapWithLimit(
    converted,
    concurrency,
    async (site) => {
      const graded = await probeSite(site, signal);
      onProgress?.(++done, converted.length);
      return graded;
    },
    signal,
  );

  // A site that didn't answer under load often answers alone: probe each unverified one again, two at a time
  const retry = sites.flatMap((site, index) => (site.reliability === "unverified" ? [index] : []));
  const retried = await mapWithLimit(
    retry,
    2,
    (index) => probeSite(converted[index], signal, sites[index].platform),
    signal,
  );
  retry.forEach((index, position) => {
    if (retried[position].reliability !== "unverified") sites[index] = retried[position];
  });

  return {
    source: { repository: `https://github.com/${REPO}`, commit: commit.sha, license: "MIT" },
    probedAt: new Date().toISOString().slice(0, 10),
    sites,
  };
}
