import { runAppleScript } from "@raycast/utils";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { KLACK_BUNDLE_ID } from "./constants";
import { classifyAppleScriptError } from "./errors";
import { ensureInstalled } from "./klack";
import type { SwitchName } from "./types";

const execAsync = promisify(exec);
// Apple absolute time is seconds since 2001-01-01 00:00:00 UTC.
const APPLE_EPOCH_OFFSET = 978307200;

export type SwitchUsage = { name: SwitchName; count: number };
export type Stats = {
  enabled: boolean;
  hasPermission: boolean;
  keystrokes: number;
  dings: number;
  clicks: number;
  switches: SwitchUsage[];
  trackingSince?: Date;
};

export const NF = new Intl.NumberFormat("en-US");
export const fmtCount = (n: number) => (n === 0 ? "—" : NF.format(n));

export async function getStats(): Promise<Stats> {
  await ensureInstalled();
  try {
    const [raw, trackingSince] = await Promise.all([
      runAppleScript(`tell application "Klack" to current stats`),
      readFirstTrackedAt(),
    ]);
    const stats = parseStats(raw);
    stats.switches.sort((a, b) => b.count - a.count);
    if (trackingSince) stats.trackingSince = trackingSince;
    return stats;
  } catch (err) {
    throw classifyAppleScriptError(err);
  }
}

type RawSwitch = { identifier?: string; name?: string; keystrokes?: number; count?: number };
type RawStats = {
  statsEnabled?: boolean;
  hasStatsPermission?: boolean;
  keystrokes?: number;
  dings?: number;
  clicks?: number;
  favouriteSwitches?: RawSwitch[];
};

function parseStats(raw: string): Stats {
  const obj = JSON.parse(raw) as RawStats;
  return {
    enabled: obj.statsEnabled !== false,
    hasPermission: obj.hasStatsPermission !== false,
    keystrokes: Number(obj.keystrokes ?? 0),
    dings: Number(obj.dings ?? 0),
    clicks: Number(obj.clicks ?? 0),
    switches: (obj.favouriteSwitches ?? [])
      .map((s) => ({ name: s.name as SwitchName, count: Number(s.keystrokes ?? s.count ?? 0) }))
      .filter((s): s is SwitchUsage => Boolean(s.name) && s.count > 0),
  };
}

// firstTrackedAt isn't in the AppleScript output but lives in the persisted snapshot.
// Read defensively — Klack could rename this key in a future version.
async function readFirstTrackedAt(): Promise<Date | undefined> {
  try {
    const { stdout } = await execAsync(`defaults read ${KLACK_BUNDLE_ID} localStatsSnapshot`);
    const obj = JSON.parse(stdout);
    const appleSeconds = Number(obj.firstTrackedAt);
    if (!Number.isFinite(appleSeconds)) return undefined;
    return new Date((appleSeconds + APPLE_EPOCH_OFFSET) * 1000);
  } catch {
    return undefined;
  }
}

export function statsToMarkdown(stats: Stats): string {
  return `**Total Usage**
- **Keystrokes:** ${fmtCount(stats.keystrokes)}
- **Dings:** ${fmtCount(stats.dings)}
- **Clicks:** ${fmtCount(stats.clicks)}

**Favourite Switches**
${stats.switches.map((s, i) => `${i + 1}. **${s.name}** — ${NF.format(s.count)}`).join("\n")}
`;
}
