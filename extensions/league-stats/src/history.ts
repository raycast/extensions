import { LocalStorage } from "@raycast/api";
import type { Profile } from "./profile";
import type { Platform } from "./regions";

export interface RecentPlayer {
  puuid: string;
  gameName: string;
  tagLine: string;
  platform: Platform;
  profileIconId: number;
  level: number;
}

const KEY = "recent-players";
const LIMIT = 12;

export async function readHistory(): Promise<RecentPlayer[]> {
  try {
    const raw = await LocalStorage.getItem<string>(KEY);
    return raw ? (JSON.parse(raw) as RecentPlayer[]) : [];
  } catch {
    return [];
  }
}

async function writeHistory(players: RecentPlayer[]) {
  await LocalStorage.setItem(KEY, JSON.stringify(players.slice(0, LIMIT)));
}

/** Moves the player to the top of the list, refreshing their name, icon and level. */
export async function rememberPlayer(profile: Profile) {
  const entry: RecentPlayer = {
    puuid: profile.puuid,
    gameName: profile.gameName,
    tagLine: profile.tagLine,
    platform: profile.platform,
    profileIconId: profile.profileIconId,
    level: profile.level,
  };
  const others = (await readHistory()).filter((player) => player.puuid !== entry.puuid);
  await writeHistory([entry, ...others]);
}

export async function forgetPlayer(puuid: string) {
  await writeHistory((await readHistory()).filter((player) => player.puuid !== puuid));
}

export async function clearHistory() {
  await LocalStorage.removeItem(KEY);
}
