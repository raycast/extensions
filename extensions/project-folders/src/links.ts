import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

export type LinkKind = "asana" | "drive" | "frameio";

export const LINK_FILES: Record<LinkKind, string> = {
  asana: "Asana.html",
  drive: "Google_Drive.html",
  frameio: "Frame_IO.html",
};

export type ProjectLinks = {
  asana?: string;
  drive?: string;
  frameio?: string;
  gid?: string;
};

const URL_RE = /window\.location\.href\s*=\s*["']([^"']+)["']/i;

export function extractGid(asanaUrl: string | undefined): string | undefined {
  if (!asanaUrl) return undefined;
  const matches = asanaUrl.match(/\d{10,}/g);
  return matches?.[matches.length - 1];
}

export function magicLinkUrl(gid: string): string {
  return `https://magicmachine.link/task/${gid}`;
}

export async function readLink(projectPath: string, kind: LinkKind): Promise<string | undefined> {
  const file = join(projectPath, LINK_FILES[kind]);
  try {
    const s = await stat(file);
    if (!s.isFile()) return undefined;
    const html = await readFile(file, "utf8");
    return html.match(URL_RE)?.[1];
  } catch {
    return undefined;
  }
}

export async function readAllLinks(projectPath: string): Promise<ProjectLinks> {
  const [asana, drive, frameio] = await Promise.all([
    readLink(projectPath, "asana"),
    readLink(projectPath, "drive"),
    readLink(projectPath, "frameio"),
  ]);
  return { asana, drive, frameio, gid: extractGid(asana) };
}
