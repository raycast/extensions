import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import { Channel, RankedChannel } from "./types";

const SPORTS_LEAGUES = new Set(["NBA", "NFL", "NHL", "NCAAF", "NCAAB", "MLB", "MLS", "UFC"]);

export function loadChannelsFromJson(): Channel[] {
  try {
    const filePath = path.join(environment.assetsPath, "channels.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Channel[];
  } catch {
    return [];
  }
}

export function parseM3u(text: string): Channel[] {
  const lines = text.split("\n");
  const channels: Channel[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("#EXTINF:")) continue;

    const streamUrl = lines[i + 1]?.trim();
    if (!streamUrl || streamUrl.startsWith("#")) continue;

    const groupMatch = line.match(/group-title="([^"]*)"/);
    const group = groupMatch?.[1] ?? "Other";
    const name = line.substring(line.lastIndexOf(",") + 1).trim();

    channels.push({ name, group, url: streamUrl });
  }

  return channels;
}

export async function fetchRemotePlaylist(url: string): Promise<Channel[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    return parseM3u(await response.text());
  } catch {
    return [];
  }
}

export function saveChannelsToJson(channels: Channel[]): void {
  const filePath = path.join(environment.assetsPath, "channels.json");
  fs.writeFileSync(filePath, JSON.stringify(channels, null, 2));
}

export function rankChannels(channels: Channel[], searchTerm: string): RankedChannel[] {
  if (!searchTerm) {
    return channels.map((channel) => ({ channel, score: 0 }));
  }

  const term = searchTerm.toLowerCase();
  const results: RankedChannel[] = [];

  for (const channel of channels) {
    let score = 0;
    const nameLower = channel.name.toLowerCase();
    const groupLower = channel.group.toLowerCase();

    if (nameLower.includes(term)) {
      score += 1000;
      if (nameLower.startsWith(term)) score += 500;
    }

    if (groupLower.includes(term)) {
      score += 800;
    }

    if (SPORTS_LEAGUES.has(channel.group.toUpperCase())) {
      score += 100;
      if (channel.group.toLowerCase() === term) score += 500;
    }

    if (score > 0) {
      results.push({ channel, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

export function groupChannelsByCategory(channels: Channel[]): Map<string, Channel[]> {
  const map = new Map<string, Channel[]>();

  for (const channel of channels) {
    const list = map.get(channel.group);
    if (list) {
      list.push(channel);
    } else {
      map.set(channel.group, [channel]);
    }
  }

  return map;
}
