import { environment } from "@raycast/api";
import { createHash } from "crypto";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { pathToFileURL } from "url";
import { adoAuth } from "./sprint-api";

/** True only for URLs of the configured Azure DevOps organization, so the PAT is never sent elsewhere. */
function isAdoUrl(url: string): boolean {
  const { org } = adoAuth();
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      ((u.hostname === "dev.azure.com" && u.pathname.toLowerCase().startsWith(`/${org.toLowerCase()}/`)) ||
        u.hostname.toLowerCase() === `${org.toLowerCase()}.visualstudio.com`)
    );
  } catch {
    return false;
  }
}

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
};

async function downloadImage(url: string): Promise<string | undefined> {
  if (!isAdoUrl(url)) return undefined;
  const dir = join(environment.supportPath, "images");
  const key = createHash("sha1").update(url).digest("hex");
  for (const ext of Object.values(EXT)) {
    const cached = join(dir, `${key}.${ext}`);
    if (existsSync(cached)) return pathToFileURL(cached).href;
  }
  const res = await fetch(url, { headers: { Authorization: adoAuth().auth } });
  if (!res.ok) return undefined;
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = EXT[type];
  if (!ext) return undefined;
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${key}.${ext}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return pathToFileURL(file).href;
}

/** Replaces Azure DevOps image URLs in markdown with local copies downloaded using the PAT. */
export async function localizeImages(markdown: string): Promise<string> {
  const re = /!\[([^\]]*)\]\((https?:[^)\s]+)[^)]*\)/g;
  const urls = [...new Set([...markdown.matchAll(re)].map((m) => m[2]))];
  const local = new Map<string, string | undefined>();
  await Promise.all(
    urls.map(async (u) => {
      try {
        local.set(u, await downloadImage(u));
      } catch {
        local.set(u, undefined);
      }
    }),
  );
  return markdown.replace(re, (full, alt: string, url: string) => {
    const l = local.get(url);
    return l ? `![${alt}](${l})` : full;
  });
}
