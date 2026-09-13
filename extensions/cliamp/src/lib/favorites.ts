import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Track } from "./ipc";

// Favorites live in cliamp's native custom-stations file. cliamp reads it at
// startup and shows these under the radio provider's "Stations" section, so
// favorites made in Raycast are visible in the TUI too (after its next start).
export const RADIOS_PATH = path.join(os.homedir(), ".config", "cliamp", "radios.toml");

export interface FavStation {
  name: string;
  url: string;
  country?: string;
  bitrate?: number;
  codec?: string;
  tags?: string;
}

const HEADER = "# Managed by the cliamp Raycast extension (Favorites). Safe to edit by hand.\n";

function unquote(v: string): string {
  const m = v.match(/^"(.*)"$/);
  return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : v;
}

function quote(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function readFavorites(): FavStation[] {
  let text: string;
  try {
    text = fs.readFileSync(RADIOS_PATH, "utf8");
  } catch {
    return [];
  }
  const stations: FavStation[] = [];
  let current: Partial<FavStation> | undefined;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "[[station]]") {
      if (current?.name && current?.url) stations.push(current as FavStation);
      current = {};
      continue;
    }
    if (!current || !line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_]+)\s*=\s*(.+)$/);
    if (!m) continue;
    const [, key, value] = m;
    if (key === "bitrate") {
      const n = parseInt(unquote(value.trim()), 10);
      if (Number.isFinite(n)) current.bitrate = n;
    } else if (key === "name" || key === "url" || key === "country" || key === "codec" || key === "tags") {
      current[key] = unquote(value.trim());
    }
  }
  if (current?.name && current?.url) stations.push(current as FavStation);
  return stations;
}

export function writeFavorites(stations: FavStation[]): void {
  const blocks = stations.map((s) => {
    const lines = ["[[station]]", `name = ${quote(s.name)}`, `url = ${quote(s.url)}`];
    if (s.country) lines.push(`country = ${quote(s.country)}`);
    if (s.bitrate !== undefined) lines.push(`bitrate = ${s.bitrate}`);
    if (s.codec) lines.push(`codec = ${quote(s.codec)}`);
    if (s.tags) lines.push(`tags = ${quote(s.tags)}`);
    return lines.join("\n");
  });
  fs.mkdirSync(path.dirname(RADIOS_PATH), { recursive: true });
  fs.writeFileSync(RADIOS_PATH, HEADER + "\n" + blocks.join("\n\n") + "\n");
}

export function addFavorite(station: FavStation): FavStation[] {
  const list = readFavorites().filter((s) => s.url !== station.url);
  list.push(station);
  writeFavorites(list);
  return list;
}

export function removeFavorite(url: string): FavStation[] {
  const list = readFavorites().filter((s) => s.url !== url);
  writeFavorites(list);
  return list;
}

export function favoriteFromTrack(t: Track): FavStation | undefined {
  if (!t.path || !t.title) return undefined;
  const meta = t.provider_meta ?? {};
  const bitrate = parseInt(String(meta["radio.bitrate"] ?? ""), 10);
  return {
    name: t.title,
    url: String(t.path),
    country: meta["radio.country"] ? String(meta["radio.country"]) : undefined,
    bitrate: Number.isFinite(bitrate) ? bitrate : undefined,
    codec: meta["radio.codec"] ? String(meta["radio.codec"]) : undefined,
    tags: t.genre ? String(t.genre) : undefined,
  };
}

export function trackFromFavorite(s: FavStation): Track {
  return { title: s.name, path: s.url, genre: s.tags, stream: true, realtime: true };
}

// Deeplink into the play-station command with the exact station baked in, so a
// Quicklink (or hotkey) starts it with zero lookups.
export function stationDeeplink(name: string, url: string): string {
  const context = encodeURIComponent(JSON.stringify({ name, url }));
  return `raycast://extensions/rickdronkers/cliamp/play-station?launchType=userInitiated&context=${context}`;
}
