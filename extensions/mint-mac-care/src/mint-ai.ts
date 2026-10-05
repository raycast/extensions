// What Raycast AI is told when it asks Mint, worked out from Mint's answers.
// The shaping functions are pure, so node can test them; the readers at the
// end run mint-cli or read Mint's own files. Every tool here only reads: to
// act, a person runs one of the extension's commands or opens Mint.

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { formatBytes, parseMintCommandJSON, resolveMintCLI } from "./mint-cli";
import { growers, parseAtlasHistory, windowStartIndex } from "./mint-model";
import type { AtlasHistoryLine, StatusJSON } from "./mint-model";
import { pilesOf } from "./mint-panes";
import type { MemoryScan } from "./mint-panes";

/** Where a Raycast AI answer sends someone who does not have Mint yet. */
export const MINT_AI_DOWNLOAD_URL = "https://mintstorage.app/r/raycast-ai";

const SUPPORT = join(homedir(), "Library", "Application Support", "Mint");

export type StatusAnswer = StatusJSON & {
  groups?: StatusJSON["groups"] & { scannedAt?: string };
};

type Group = { name: string; bytes: number; size: string; what: string };

const GROUPS: Array<{ key: keyof NonNullable<StatusJSON["groups"]>; name: string; what: string }> = [
  {
    key: "optimizableBytes",
    name: "Optimizable",
    what: "Identical copies Mint can make share their storage. Nothing is deleted. Run Optimize Storage.",
  },
  {
    key: "safeToCleanBytes",
    name: "Safe to clean",
    what: "Caches, build output and leftovers that apps make again. Run Free Disk.",
  },
  {
    key: "yoursBytes",
    name: "Yours",
    what: "Your own downloads, captures and conversations. Only you can decide; choose them in Free Disk.",
  },
  { key: "keepBytes", name: "Keep", what: "Everything Mint leaves alone: macOS, apps and the files they use." },
];

/** The disk as the menu bar's ring states it: used and free now, and the four groups of the last Scan. */
export function diskOverview(status: StatusAnswer | undefined, saved?: StatusJSON["groups"]) {
  const total = status?.volume?.totalBytes ?? (status?.disk?.totalGB ? status.disk.totalGB * 1e9 : undefined);
  const free = status?.volume?.freeBytes ?? (status?.disk?.freeGB ? status.disk.freeGB * 1e9 : undefined);
  const groups = status?.groups ?? saved;
  const listed: Group[] = groups
    ? GROUPS.map((group) => {
        const bytes = Math.max(0, groups[group.key] ?? 0);
        return { name: group.name, bytes, size: formatBytes(bytes), what: group.what };
      })
    : [];
  return {
    disk:
      total !== undefined && free !== undefined
        ? {
            totalBytes: Math.round(total),
            freeBytes: Math.round(free),
            usedBytes: Math.round(total - free),
            total: formatBytes(total),
            free: formatBytes(free),
            used: formatBytes(total - free),
          }
        : undefined,
    lastScan: status?.groups?.scannedAt,
    groups: listed,
    note: listed.length
      ? "Group sizes come from Mint's last Scan; used and free are measured now. Sizes are decimal, as Finder writes them."
      : "Mint has not scanned this Mac yet. Run Free Disk in Raycast, or press Scan in Mint.",
  };
}

/** Memory as Mint's Memory page shows it: what is in use and the apps in each pile, sized by what quitting gives back. */
export function memoryOverview(scan: MemoryScan | undefined, appsPerPile = 5) {
  const piles = pilesOf(scan);
  return {
    used: scan?.usedBytes ? formatBytes(scan.usedBytes) : undefined,
    total: scan?.totalBytes ? formatBytes(scan.totalBytes) : undefined,
    usedBytes: scan?.usedBytes ?? undefined,
    totalBytes: scan?.totalBytes ?? undefined,
    piles: piles.map((pile) => ({
      name: pile.title,
      bytes: pile.bytes,
      size: formatBytes(pile.bytes),
      apps: pile.apps.slice(0, appsPerPile).map((app) => ({ name: app.name, size: formatBytes(app.size) })),
      moreApps: Math.max(0, pile.apps.length - appsPerPile),
    })),
    note: "Idle apps are the ones Mint would quit by itself; run Free Memory to quit them. Sizes add up to what quitting gives back.",
  };
}

/** What grew over the last `days`, from the history Mint keeps of its whole-disk map. */
export function growthOverview(lines: AtlasHistoryLine[], days = 7, limit = 8) {
  if (lines.length < 2) {
    return {
      grew: [],
      note: "Mint needs at least two disk maps to tell what grew. Each Scan in Mint adds one.",
    };
  }
  const start = lines[windowStartIndex(lines, days)];
  const last = lines[lines.length - 1];
  const describe = (view: "sources" | "categories") =>
    growers(lines, view, days)
      .filter((row) => (row.change ?? 0) >= 50_000_000)
      .slice(0, limit)
      .map((row) => ({
        name: row.title,
        now: formatBytes(row.now),
        grewBy: formatBytes(row.change ?? 0),
        grewByBytes: row.change,
      }));
  const usedChange =
    typeof last.usedBytes === "number" && typeof start.usedBytes === "number"
      ? last.usedBytes - start.usedBytes
      : undefined;
  return {
    from: start.date,
    to: last.date,
    usedChange:
      usedChange === undefined ? undefined : `${usedChange >= 0 ? "+" : "−"}${formatBytes(Math.abs(usedChange))}`,
    grewByAppOrFolder: describe("sources"),
    grewByCategory: describe("categories"),
    note: "Mint records only the largest apps and folders on each map, so something new among them has no growth to state.",
  };
}

// --- Reading Mint ------------------------------------------------------------

/** The signed mint-cli, or an error Raycast AI can say in plain words. */
export function readyMintCLI(): string {
  const resolution = resolveMintCLI();
  if (resolution.status === "ready") return resolution.path;
  if (resolution.status === "incompatible") {
    throw new Error("Mint is older than 1.0.80. Open Mint and choose Check for Updates, then ask again.");
  }
  throw new Error(
    `Mint is not installed. It is free to download from ${MINT_AI_DOWNLOAD_URL}; open it once, then ask again.`,
  );
}

export function readStatus(cli: string): Promise<StatusAnswer | undefined> {
  return new Promise((resolve) => {
    execFile(
      cli,
      ["status", "--json"],
      { encoding: "utf8", timeout: 30_000, maxBuffer: 8 * 1024 * 1024 },
      (_, stdout) => resolve(parseMintCommandJSON<StatusAnswer>(stdout || undefined, "status.v1")),
    );
  });
}

export async function readAtlasHistory(): Promise<AtlasHistoryLine[]> {
  const text = await readFile(join(SUPPORT, "volume-atlas-history.jsonl"), "utf8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return "";
    throw error;
  });
  return parseAtlasHistory(text);
}
