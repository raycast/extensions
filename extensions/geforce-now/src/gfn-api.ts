import { getAccessToken, getIdToken, getSharedstoragePath } from "./auth";
import * as fs from "fs";

export interface GFNGame {
  id: string;
  title: string;
  shortName?: string;
  cmsId?: string;
  parentGameId?: string;
}

const GAMES_API_URL = "https://games.geforce.com/graphql";

// reads huID 

function readHuId(): string | null {
  try {
    const storagePath = getSharedstoragePath();
    const content = fs.readFileSync(storagePath, "utf-8");
    const storageData = JSON.parse(content);
    const deviceId = storageData?.gfnTelemetry?.deviceId;
    return typeof deviceId === "string" ? deviceId.slice(0, 32) : null;
  } catch {
    return null;
  }
}

// builds the GraphQL query URL

function buildUrl(huid: string | null, cursor: string = ""): string {
  const variables = {
    vpcId: "NP-WAW-01",
    locale: "en_US",
    filters: { variants: { gfn: { library: { status: { notEquals: "NOT_OWNED" } } } } },
    sortString: "variants.gfn.library.lastPlayedDate:DESC,computedValues.libraryAddedDate:DESC,sortName:ASC",
    fetchCount: 100,
    cursor: cursor || "",
  };

  const extensions = { persistedQuery: { sha256Hash: "5ae1cfe2e04debdcd81279b5559313abab7d9cfa3ac9d9c048e969b3d445dcb9" } };
  const searchParams = new URLSearchParams({
    requestType: "apps",
    variables: JSON.stringify(variables),
    extensions: JSON.stringify(extensions),
  });

  if (huid) searchParams.set("huId", huid);
  return `${GAMES_API_URL}?${searchParams.toString()}`;
}

// extracts game data from API 

function extractGames(apps: any[]): GFNGame[] {
  return apps.map((app) => {
    const title = app.title || app.displayName || app.name || app.sortName || app.id;
    const variant = Array.isArray(app.variants) && app.variants.length ? app.variants[0] : null;
    const variantId = variant?.id || app.id;
    const shortName = variant?.sortName || title;

    return {
      id: app.id,
      title,
      shortName,
      cmsId: variantId,
      parentGameId: app.id,
    };
  });
}

// main function to load games

export async function fetchGameLibrary(): Promise<GFNGame[]> {
  const accessToken = getAccessToken();
  const idToken = getIdToken();
  if (!accessToken || !idToken) throw new Error("auth");
  const huid = readHuId();
  const allApps: any[] = [];
  let cursor = "";
  const fetchCount = 100;
  let iterations = 0;

  while (iterations < 50) {
    const url = buildUrl(huid, cursor);
    let response: Response;

    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `GFNJWT ${idToken}`,
          Accept: "application/json",
          "NV-Client-Type": "BROWSER",
          "NV-Device-OS": "WINDOWS",
          "NV-Device-Type": "DESKTOP",
          Origin: "https://play.geforcenow.com",
          "x-sw-cachebypass": "true",
        },
      });
    } catch {
      throw new Error("network");
    }

    if (!response.ok) throw new Error("api");

    const data = await response.json().catch(() => {
      throw new Error("api");
    });

    if (data.errors && Array.isArray(data.errors)) throw new Error("api");

    // Try different paths where apps may appear
    let appsBatch: any[] = [];
    if (Array.isArray(data.data?.viewer?.apps?.items)) appsBatch = data.data.viewer.apps.items;
    else if (Array.isArray(data.data?.viewer?.apps)) appsBatch = data.data.viewer.apps;
    else if (Array.isArray(data.data?.apps?.items)) appsBatch = data.data.apps.items;
    else if (Array.isArray(data.data?.apps)) appsBatch = data.data.apps;
    else if (Array.isArray(data.apps)) appsBatch = data.apps;

    if (appsBatch.length > 0) {
      allApps.push(...appsBatch);
    }

    // Attempt to read next cursor from common locations
    const pageInfo = data.data?.viewer?.apps?.pageInfo || data.data?.apps?.pageInfo || data.data?.viewer?.apps || data.data?.apps;
    let nextCursor: string | undefined = undefined;
    if (pageInfo) {
      nextCursor = pageInfo.endCursor || pageInfo.nextCursor || pageInfo.cursor || undefined;
      // Some APIs return a hasNextPage flag
      const hasNext = pageInfo.hasNextPage ?? pageInfo.has_more ?? undefined;
      if (hasNext === false) nextCursor = undefined;
    }

    // Safety: if we got fewer than fetchCount items, probably last page
    if (appsBatch.length < fetchCount) nextCursor = undefined;

    if (!nextCursor) break;

    cursor = String(nextCursor);
    iterations += 1;
  }

  // Deduplicate by id
  const unique = new Map<string, any>();
  for (const app of allApps) {
    if (!app || !app.id) continue;
    if (!unique.has(app.id)) unique.set(app.id, app);
  }

  return extractGames(Array.from(unique.values()));
}
