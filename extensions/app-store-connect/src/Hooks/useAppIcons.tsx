import { useCachedPromise } from "@raycast/utils";
import { App, buildIconSchemas } from "../Model/schemas";
import { fetchAppStoreConnect } from "./useAppStoreConnect";

/**
 * How many apps to ask about per request.
 *
 * Two independent ceilings force batching, and one request cannot satisfy either:
 *
 * 1. `limit=200` bounds BUILDS returned, not apps covered. Sorted newest-first across
 *    every requested app, 200 recent builds for one busy app can fill the page and leave
 *    every other app iconless.
 * 2. All ids go into a single query parameter, so a large account builds a multi-kilobyte
 *    request target.
 *
 * Asking about a small number of apps at a time bounds both: 25 apps against a 200-build
 * page leaves 8 builds of headroom each, which is ample to find one carrying an icon.
 */
const APPS_PER_REQUEST = 25;
const BUILDS_PER_REQUEST = 200;

function iconURLFromToken(token: { templateUrl: string; width: number; height: number }): string {
  return token.templateUrl
    .replace("{w}", token.width.toString())
    .replace("{h}", token.height.toString())
    .replace("{f}", "png");
}

/**
 * Resolves app icons for a whole list.
 *
 * App Store Connect exposes an app's icon only through its builds, so each row used to
 * fetch `/builds?filter[app]={id}&limit=1` for itself — one request per visible app,
 * against a rate-limited API. `filter[app]` accepts a comma-separated set, so this asks
 * about {@link APPS_PER_REQUEST} apps at a time instead: a handful of requests for any
 * realistic account, rather than one per row.
 *
 * Results are sorted newest-first, so the first build seen for an app wins.
 */
export function useAppIcons(apps: App[] | null | undefined): Record<string, string> {
  const appIds = (apps ?? []).map((app) => app.id);
  // Joined for the dependency key: useCachedPromise compares deps by value, and a fresh
  // array identity on every render would refetch forever.
  const appIdsKey = appIds.join(",");

  const { data } = useCachedPromise(
    async (idsKey: string) => {
      const ids = idsKey.length > 0 ? idsKey.split(",") : [];
      const iconsByAppId: Record<string, string> = {};

      for (let start = 0; start < ids.length; start += APPS_PER_REQUEST) {
        const batch = ids.slice(start, start + APPS_PER_REQUEST);
        const path =
          `/builds?filter[app]=${batch.join(",")}` +
          `&sort=-uploadedDate&limit=${BUILDS_PER_REQUEST}` +
          `&fields[builds]=iconAssetToken,app&include=app`;

        // One failing batch must not cost every other batch its icons — a missing icon
        // is cosmetic, and the list still renders with the fallback glyph.
        try {
          const response = await fetchAppStoreConnect(path);
          const json = await response.json();
          const builds = buildIconSchemas.safeParse(json.data).data ?? [];
          for (const build of builds) {
            const appId = build.relationships?.app?.data?.id;
            const token = build.attributes?.iconAssetToken;
            if (!appId || !token || iconsByAppId[appId] !== undefined) {
              continue;
            }
            iconsByAppId[appId] = iconURLFromToken(token);
          }
        } catch {
          continue;
        }
      }

      return iconsByAppId;
    },
    [appIdsKey],
    { execute: appIdsKey.length > 0, initialData: {} },
  );

  return data ?? {};
}
