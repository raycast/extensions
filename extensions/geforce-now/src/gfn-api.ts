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

function buildUrl(huid: string | null): string {
  const variables = {
    vpcId: "NP-WAW-01",
    locale: "en_US",
    filters: { variants: { gfn: { library: { status: { notEquals: "NOT_OWNED" } } } } },
    sortString: "variants.gfn.library.lastPlayedDate:DESC,computedValues.libraryAddedDate:DESC,sortName:ASC",
    fetchCount: 100,
    cursor: "",
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

export async function fetchGameLibrary(): Promise<GFNGame[]> {
  const accessToken = getAccessToken();
  const idToken = getIdToken();
  if (!accessToken || !idToken) throw new Error("auth");

  const url = buildUrl(readHuId());
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

  const apps = data.data?.viewer?.apps || data.data?.apps?.items || data.data?.apps || data.apps || [];
  return Array.isArray(apps) ? extractGames(apps) : [];
}
