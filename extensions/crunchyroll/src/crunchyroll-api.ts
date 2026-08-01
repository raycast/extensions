// Crunchyroll API client - uses anonymous/guest token (no account needed)
// Uses runAppleScript + do shell script for HTTP (works reliably in Raycast)

import { runAppleScript } from "@raycast/utils";
import { randomUUID } from "crypto";
import { writeFileSync, unlinkSync, mkdtempSync, rmdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const CRUNCHYROLL_API = "https://beta-api.crunchyroll.com";
const BASIC_AUTH =
  "Basic dC1rZGdwMmg4YzNqdWI4Zm4wZnE6eWZMRGZNZnJZdktYaDRKWFMxTEVJMmNDcXUxdjVXYW4=";

export interface AnimeSeries {
  id: string;
  title: string;
  description: string;
  slug: string;
  slugTitle: string;
  image: string;
  year: number | null;
  episodes: number | null;
  isPremium: boolean;
  url: string;
}

interface CacheEntry {
  token: string;
  expires: number;
}

let tokenCache: CacheEntry | null = null;

async function curlJSON(
  url: string,
  headers: Record<string, string>,
  method: string = "GET",
  body?: string,
): Promise<string> {
  // Write a shell script to a temp file to avoid all escaping issues
  const tmpDir = mkdtempSync(join(tmpdir(), "cr-"));
  const scriptPath = join(tmpDir, "fetch.sh");

  const headerArgs = Object.entries(headers)
    .map(([k, v]) => `-H '${k}: ${v.replace(/'/g, "'\\''")}'`)
    .join(" ");

  const bodyArg = body ? `-d '${body.replace(/'/g, "'\\''")}'` : "";

  const script = `#!/bin/bash
curl -s --max-time 15 -X ${method} ${headerArgs} ${bodyArg} '${url.replace(/'/g, "'\\''")}'
`;

  writeFileSync(scriptPath, script, { mode: 0o755 });

  try {
    const result = await runAppleScript(
      `do shell script "/bin/bash ${scriptPath}"`,
    );
    return result;
  } finally {
    try {
      unlinkSync(scriptPath);
    } catch {
      // ignore
    }
    try {
      rmdirSync(tmpDir);
    } catch {
      // ignore
    }
  }
}

export async function getAnonymousToken(): Promise<string> {
  if (tokenCache && tokenCache.expires > Date.now() + 60000) {
    return tokenCache.token;
  }

  const uuid = randomUUID();

  const stdout = await curlJSON(
    `${CRUNCHYROLL_API}/auth/v1/token`,
    {
      Authorization: BASIC_AUTH,
      "Content-Type": "application/x-www-form-urlencoded",
      "ETP-Anonymous-ID": uuid,
    },
    "POST",
    "grant_type=client_id",
  );

  let data: { access_token: string; expires_in: number };
  try {
    data = JSON.parse(stdout);
  } catch {
    throw new Error(`Token parse error: ${stdout.slice(0, 200)}`);
  }

  if (!data.access_token) {
    throw new Error(`Token failed: ${stdout.slice(0, 200)}`);
  }

  tokenCache = {
    token: data.access_token,
    expires: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

export async function searchAnime(query: string): Promise<AnimeSeries[]> {
  const token = await getAnonymousToken();

  const encodedQuery = encodeURIComponent(query);
  const url = `${CRUNCHYROLL_API}/content/v2/discover/search?q=${encodedQuery}&n=20&type=series&locale=en-US`;

  const stdout = await curlJSON(url, {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  });

  let data: {
    data: Array<{
      type: string;
      items: Array<{
        id: string;
        title: string;
        description: string;
        slug: string;
        slug_title: string;
        images: {
          poster_wide: Array<Array<{ source: string }>>;
          poster_tall: Array<Array<{ source: string }>>;
        };
        series_metadata: {
          series_launch_year: number;
          episode_count: number;
          is_premium_only: boolean;
        };
      }>;
    }>;
  };

  try {
    data = JSON.parse(stdout);
  } catch {
    throw new Error(`Search parse error: ${stdout.slice(0, 300)}`);
  }

  const results: AnimeSeries[] = [];

  for (const group of data.data ?? []) {
    for (const item of group.items ?? []) {
      const image =
        item.images?.poster_tall?.[0]?.[0]?.source ||
        item.images?.poster_wide?.[0]?.[0]?.source ||
        "";

      results.push({
        id: item.id,
        title: item.title,
        description: item.description || "",
        slug: item.slug || "",
        slugTitle: item.slug_title || item.slug || "",
        image,
        year: item.series_metadata?.series_launch_year ?? null,
        episodes: item.series_metadata?.episode_count ?? null,
        isPremium: item.series_metadata?.is_premium_only ?? false,
        url: `https://www.crunchyroll.com/series/${item.id}/${item.slug_title || item.slug || ""}`,
      });
    }
  }

  return results;
}
