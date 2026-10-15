// What the commands state, worked out from Mint's answers. Pure and
// import-free like mint-visuals, so node can test it; sizes are written by the
// formatter the caller passes.

import type { ByteFormatter, FolderCard, GroupBytes, LegendRow, ResourceCard } from "./mint-visuals";

export const TIER_COLORS = { optimizable: "#3DDC84", safeToClean: "#62A3FF", yours: "#F5BD45", keep: "#8E8E93" };
export const PILE_COLORS = { idle: "#F5BD45", inUse: "#62A3FF", keep: "#8E8E93" };

const GIB = 1024 ** 3;

// --- Memory attribution ------------------------------------------------------

/**
 * Mint's own rule (MemoryAttribution): per-process footprints count shared
 * pages again for every process, so they are scaled by host used ÷ their sum
 * over the whole set, and never scaled up. The surface lists the whole set.
 */
export function memoryScale(rawBytes: number[], hostUsed: number | null | undefined): number {
  const raw = rawBytes.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (!hostUsed || hostUsed <= 0 || raw <= hostUsed) return 1;
  return hostUsed / raw;
}

export function attributed(rawBytes: number, scale: number): number {
  if (rawBytes <= 0) return 0;
  return scale < 1 ? Math.round(rawBytes * scale) : rawBytes;
}

// --- Status: the dropdown's cards -------------------------------------------

export type StatusJSON = {
  disk?: { totalGB?: number; freeGB?: number };
  volume?: { freeBytes?: number; totalBytes?: number };
  groups?: { optimizableBytes?: number; safeToCleanBytes?: number; yoursBytes?: number; keepBytes?: number };
};

export type CareTask = {
  taskType?: string;
  enabled?: boolean;
  scheduleFrequency?: string;
  scheduleTimeMinutes?: number;
  folderPaths?: string[];
  diskCareBucket?: string;
};

export type AutoCareJSON = {
  automationAllowed?: boolean;
  memory?: { available?: boolean; enabled?: boolean; threshold?: number };
  tasks?: CareTask[];
  folders?: Array<{ path: string; enabled?: boolean; organizeOnArrival?: boolean }>;
};

export type MemoryJSON = {
  usedBytes?: number | null;
  totalBytes?: number | null;
  piles?: { idleBytes?: number; inUseBytes?: number; keepBytes?: number };
};

/**
 * The four groups from the presentation Mint saves after a Scan
 * (disk-presentation-v1.json), folded exactly as mint-cli's DiskGroupsReader
 * and DiskDecisionGroup.canonical fold them: the numbers the menu bar's ring
 * shows. For Mint builds whose CLI does not state `groups` yet.
 */
export function groupsFromPresentation(json: unknown): StatusJSON["groups"] | undefined {
  const tree = (json as { tree?: Array<{ onDisk?: number; decisionBytes?: Record<string, number> }> } | undefined)
    ?.tree;
  if (!Array.isArray(tree) || tree.length === 0) return undefined;
  const sums = { optimizableBytes: 0, safeToCleanBytes: 0, yoursBytes: 0, keepBytes: 0 };
  const fold: Record<string, keyof typeof sums> = {
    optimizable: "optimizableBytes",
    leftovers: "safeToCleanBytes",
    rebuildable: "safeToCleanBytes",
    compressible: "yoursBytes",
    clutter: "yoursBytes",
    cleanNow: "yoursBytes",
    asNeeded: "yoursBytes",
    personal: "yoursBytes",
    appsAndFiles: "yoursBytes",
    duplicatesSimilar: "yoursBytes",
    retained: "keepBytes",
    agentConversations: "keepBytes",
  };
  for (const row of tree) {
    const decisions = row.decisionBytes ?? {};
    const keys = Object.keys(decisions);
    if (keys.length === 0) {
      sums.keepBytes += Math.max(0, row.onDisk ?? 0);
      continue;
    }
    for (const key of keys) {
      const target = fold[key];
      if (target) sums[target] += Math.max(0, decisions[key] ?? 0);
    }
  }
  return sums;
}

export function diskCard(
  status: StatusJSON,
  care: AutoCareJSON | undefined,
  format: ByteFormatter,
): ResourceCard | undefined {
  const total = status.volume?.totalBytes ?? (status.disk?.totalGB ?? 0) * GIB;
  const free = status.volume?.freeBytes ?? (status.disk?.freeGB ?? 0) * GIB;
  if (!(total > 0)) return undefined;
  const used = Math.max(0, total - free);
  const groups = groupBytes(status.groups);
  const legend: LegendRow[] = groups
    ? [
        { title: "Optimizable", color: TIER_COLORS.optimizable, bytes: groups.optimizable },
        { title: "Safe to clean", color: TIER_COLORS.safeToClean, bytes: groups.safeToClean },
        { title: "Yours", color: TIER_COLORS.yours, bytes: groups.yours },
        { title: "Keep", color: TIER_COLORS.keep, bytes: groups.keep },
      ]
    : [
        { title: "In use", color: TIER_COLORS.keep, bytes: used },
        { title: "Free", color: TIER_COLORS.keep, bytes: free, free: true },
      ];
  return {
    icon: "disk",
    title: "Disk",
    usage: `${format(used)} / ${format(total)}`,
    // The dropdown's centre: what can go now. Without the groups, free space.
    center: groups
      ? { value: format(groups.optimizable + groups.safeToClean), label: "ready" }
      : { value: format(free), label: "free" },
    legend,
    totalBytes: total,
    care: diskCare(care),
  };
}

export function memoryCard(
  memory: MemoryJSON | undefined,
  care: AutoCareJSON | undefined,
  format: ByteFormatter,
): ResourceCard | undefined {
  const total = memory?.totalBytes ?? 0;
  const used = memory?.usedBytes ?? 0;
  if (!(total > 0)) return undefined;
  const piles = memory?.piles;
  const legend: LegendRow[] = piles
    ? [
        { title: "Idle", color: PILE_COLORS.idle, bytes: piles.idleBytes ?? 0 },
        { title: "In use", color: PILE_COLORS.inUse, bytes: piles.inUseBytes ?? 0 },
        { title: "Keep", color: PILE_COLORS.keep, bytes: piles.keepBytes ?? 0 },
      ]
    : [
        { title: "In use", color: PILE_COLORS.inUse, bytes: used },
        { title: "Free", color: PILE_COLORS.keep, bytes: Math.max(0, total - used), free: true },
      ];
  return {
    icon: "memory",
    title: "Memory",
    usage: `${format(used)} / ${format(total)}`,
    center: piles
      ? { value: format(piles.idleBytes ?? 0), label: "idle" }
      : { value: format(Math.max(0, total - used)), label: "free" },
    legend,
    totalBytes: total,
    care: memoryCare(care),
  };
}

function groupBytes(groups: StatusJSON["groups"]): GroupBytes | undefined {
  if (!groups) return undefined;
  return {
    optimizable: groups.optimizableBytes ?? 0,
    safeToClean: groups.safeToCleanBytes ?? 0,
    yours: groups.yoursBytes ?? 0,
    keep: groups.keepBytes ?? 0,
  };
}

export function diskCare(care: AutoCareJSON | undefined): string {
  if (!care) return "…";
  if (care.automationAllowed === false) return "Needs a plan";
  const on = (care.tasks ?? []).filter((task) => task.enabled && task.taskType === "cleanup" && task.diskCareBucket);
  if (!on.length) return "Off";
  return on.some((task) => task.scheduleFrequency === "hourly") ? "Every hour, when idle" : "Every day, when idle";
}

export function memoryCare(care: AutoCareJSON | undefined): string {
  if (!care) return "…";
  if (care.automationAllowed === false) return "Needs a plan";
  if (!care.memory?.available) return "Off";
  return care.memory.enabled && care.memory.threshold ? `At ${care.memory.threshold}% used` : "Off";
}

export function folderCare(path: string, care: AutoCareJSON | undefined, organizeOnArrival?: boolean): string {
  if (!care) return "…";
  if (care.automationAllowed === false) return "Needs a plan";
  if (organizeOnArrival) return "As files arrive";
  const task = (care.tasks ?? []).find(
    (entry) =>
      entry.enabled &&
      entry.taskType === "organize" &&
      entry.scheduleFrequency !== "manual" &&
      (entry.folderPaths ?? []).includes(path),
  );
  if (!task) return "Off";
  const often = task.scheduleFrequency === "weekly" ? "Weekly" : "Daily";
  return typeof task.scheduleTimeMinutes === "number" ? `${often}, ${clock(task.scheduleTimeMinutes)}` : often;
}

export function folderStatus(toSort: number | undefined): string {
  if (toSort === undefined) return "…";
  return toSort === 0 ? "Tidy" : `${toSort.toLocaleString("en-US")} to sort`;
}

export function folderCards(
  folders: Array<{ path: string; organizeOnArrival?: boolean; toSort?: number }>,
  care: AutoCareJSON | undefined,
): FolderCard[] {
  return folders.map((folder) => ({
    name: folder.path.split("/").filter(Boolean).pop() ?? folder.path,
    status: folderStatus(folder.toSort),
    care: folderCare(folder.path, care, folder.organizeOnArrival),
  }));
}

export function clock(minutes: number): string {
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

// --- Optimize sources, as the app's chips name them (OptimizableOwner) ---

/** Each AI tool's storage roots under the home folder (AIWorkspaceTool.relativeRoots). */
const AGENT_ROOTS: Array<[string, string[]]> = [
  [
    "codex",
    [
      ".codex",
      "Library/Application Support/Codex",
      "Library/Application Support/com.openai.codex",
      "Library/Caches/Codex",
      "Library/Caches/com.openai.codex",
    ],
  ],
  ["claudeCode", [".claude", "Library/Caches/claude-cli-nodejs"]],
  [
    "claudeDesktop",
    [
      "Library/Application Support/Claude",
      "Library/Caches/com.anthropic.claudefordesktop",
      "Library/Caches/com.anthropic.claudefordesktop.ShipIt",
    ],
  ],
  ["cursor", [".cursor", "Library/Application Support/Cursor", "Library/Caches/cursor-compile-cache"]],
  ["geminiCLI", [".gemini"]],
  ["copilotCLI", [".copilot"]],
  ["windsurf", [".codeium", "Library/Application Support/Windsurf"]],
  [
    "vsCodeAIExtensions",
    [
      "Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev",
      "Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline",
      "Library/Application Support/Code/User/globalStorage/kilocode.kilo-code",
      "Library/Application Support/Code/User/globalStorage/github.copilot-chat",
      "Library/Application Support/Code/User/globalStorage/anthropic.claude-code",
    ],
  ],
  ["chatGPTDesktop", ["Library/Containers/com.openai.chat", "Library/Application Support/com.openai.chat"]],
  ["kiro", [".kiro"]],
  ["openCode", [".local/share/opencode"]],
  ["continueDev", [".continue"]],
  ["ollama", [".ollama"]],
  ["lmStudio", [".lmstudio", ".cache/lm-studio"]],
  ["huggingFace", [".cache/huggingface"]],
];

const AGENT_TITLES: Record<string, string> = {
  codex: "Codex",
  claudeCode: "Claude",
  claudeDesktop: "Claude",
  cursor: "Cursor",
  geminiCLI: "Gemini CLI",
  copilotCLI: "GitHub Copilot CLI",
  windsurf: "Windsurf",
  vsCodeAIExtensions: "VS Code AI extensions",
  chatGPTDesktop: "ChatGPT",
  kiro: "Kiro",
  openCode: "OpenCode",
  continueDev: "Continue",
  ollama: "Ollama",
  lmStudio: "LM Studio",
  huggingFace: "Hugging Face cache",
};

/**
 * The source a path belongs to, keyed as the app's snapshot keys it
 * ("agent:codex", "files", "apps", "tmp"). Claude Desktop joins Claude Code,
 * as the app's chips group them (filterOwner).
 */
export function sourceOf(path: string, home: string): string {
  let best: [number, string] | undefined;
  for (const [tool, roots] of AGENT_ROOTS) {
    for (const root of roots) {
      const prefix = `${home}/${root}/`;
      if (path.startsWith(prefix) && (!best || prefix.length > best[0])) best = [prefix.length, tool];
    }
  }
  if (best) return displaySource(`agent:${best[1]}`);
  if (path.startsWith("/private/tmp/") || path.startsWith("/tmp/")) return "tmp";
  return path.startsWith(`${home}/Library/`) ? "apps" : "files";
}

export function displaySource(key: string): string {
  return key === "agent:claudeDesktop" ? "agent:claudeCode" : key;
}

export function sourceTitle(key: string): string {
  if (key.startsWith("agent:")) return AGENT_TITLES[key.slice(6)] ?? key.slice(6);
  return key === "files" ? "Files" : key === "apps" ? "Apps & data" : key === "tmp" ? "Temporary files" : key;
}

/** The AI agents lead, then the person's files, app data, temporary files. */
export function sourceOrder(key: string): number {
  return key.startsWith("agent:") ? 0 : key === "files" ? 1 : key === "apps" ? 2 : 3;
}

// ---------------------------------------------------------------------------
// Disk growth, from the history Mint writes after each whole-disk map
// (volume-atlas-history.jsonl): what grew most over a window.
// ---------------------------------------------------------------------------

export type AtlasHistoryLine = {
  date: string;
  usedBytes?: number;
  sources?: Record<string, number>;
  categories?: Record<string, number>;
  vendors?: Record<string, number>;
};

export type GrowthView = "sources" | "categories" | "vendors";

export type Grower = {
  key: string;
  title: string;
  now: number;
  /** Change over the window; undefined when it was not recorded at the window's start. */
  change?: number;
  series: Array<{ at: number; bytes: number | null }>;
};

const CATEGORY_TITLES: Record<string, string> = {
  system: "macOS & system",
  apps: "Applications",
  appData: "App data",
  aiAgents: "AI agents",
  developer: "Developer",
  yourFiles: "Your files",
  trash: "Trash",
  other: "Other",
};

const VENDOR_TITLES: Record<string, string> = {
  codex: "Codex",
  claude: "Claude",
  cursor: "Cursor",
  "other-ai": "Other AI tools",
};

export function parseAtlasHistory(text: string): AtlasHistoryLine[] {
  return text
    .split("\n")
    .map((line) => {
      try {
        return JSON.parse(line) as AtlasHistoryLine;
      } catch {
        return undefined;
      }
    })
    .filter((line): line is AtlasHistoryLine => Boolean(line?.date) && !Number.isNaN(Date.parse(line!.date)))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

/** The newest line at least `days` older than the last one, else the oldest. */
export function windowStartIndex(lines: AtlasHistoryLine[], days: number): number {
  if (lines.length < 2) return 0;
  const cutoff = Date.parse(lines[lines.length - 1].date) - days * 86_400_000;
  let index = 0;
  for (let i = 0; i < lines.length - 1; i += 1) if (Date.parse(lines[i].date) <= cutoff) index = i;
  return index;
}

/**
 * Every entry of a view with its size now and its change since the window's
 * start, largest growth first. Mint records only the largest sources, so an
 * entry missing at the start has no change to state rather than a change from zero.
 */
export function growers(lines: AtlasHistoryLine[], view: GrowthView, days: number): Grower[] {
  if (!lines.length) return [];
  const last = lines[lines.length - 1];
  const start = lines[windowStartIndex(lines, days)];
  const table = (line: AtlasHistoryLine) => line[view] ?? {};
  const rows = Object.entries(table(last)).map(([key, now]) => {
    const before = table(start)[key];
    return {
      key,
      title:
        view === "categories" ? (CATEGORY_TITLES[key] ?? key) : view === "vendors" ? (VENDOR_TITLES[key] ?? key) : key,
      now,
      change: lines.length > 1 && typeof before === "number" ? now - before : undefined,
      series: lines.map((line) => ({ at: Date.parse(line.date), bytes: table(line)[key] ?? null })),
    };
  });
  return rows.sort(
    (a, b) =>
      (a.change === undefined ? 1 : 0) - (b.change === undefined ? 1 : 0) || (b.change ?? b.now) - (a.change ?? a.now),
  );
}

export function usedSeries(lines: AtlasHistoryLine[]): Array<{ at: number; bytes: number | null }> {
  return lines.map((line) => ({ at: Date.parse(line.date), bytes: line.usedBytes ?? null }));
}
