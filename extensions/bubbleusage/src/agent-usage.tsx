import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  environment,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type WindowKey = "fiveHour" | "weekly" | "monthly";

type UsageWindow = {
  title: string;
  usedTokens: number;
  limitTokens: number;
  percent?: number;
  resetAt: Date;
  supported: boolean;
};

type AgentStatus = {
  id: AgentId;
  name: string;
  cli: string;
  connected: boolean;
  authPath?: string;
  dataPaths: string[];
  connectionHint: string;
  loginCommand: string;
  windows: Record<WindowKey, UsageWindow>;
  notes: string[];
};

type AgentId = "claude" | "codex" | "gemini" | "opencode";

type AgentConfig = {
  paths?: Partial<Record<AgentId, { auth?: string[]; logs?: string[] }>>;
  limits?: Partial<Record<AgentId, Partial<Record<WindowKey, number>>>>;
};

const home = os.homedir();

const AGENTS: Record<
  AgentId,
  Omit<AgentStatus, "connected" | "windows" | "notes"> & {
    authPaths: string[];
    logPaths: string[];
  }
> = {
  claude: {
    id: "claude",
    name: "Claude Code",
    cli: "claude",
    authPaths: ["~/.claude/.credentials.json", "~/.claude.json"],
    authPath: "~/.claude/.credentials.json",
    dataPaths: [],
    logPaths: ["~/.claude/projects"],
    connectionHint: "Install Claude Code, then run `claude` and sign in.",
    loginCommand: "claude",
  },
  codex: {
    id: "codex",
    name: "Codex CLI",
    cli: "codex",
    authPaths: ["~/.codex/auth.json"],
    authPath: "~/.codex/auth.json",
    dataPaths: [],
    logPaths: ["~/.codex/sessions"],
    connectionHint: "Install Codex CLI, then run `codex login`.",
    loginCommand: "codex login",
  },
  gemini: {
    id: "gemini",
    name: "Gemini CLI",
    cli: "gemini",
    authPaths: ["~/.gemini/oauth_creds.json", "~/.gemini/settings.json"],
    authPath: "~/.gemini/oauth_creds.json",
    dataPaths: [],
    logPaths: ["~/.gemini"],
    connectionHint:
      "Install Gemini CLI, then run `gemini auth login` or `gemini` and sign in.",
    loginCommand: "gemini auth login",
  },
  opencode: {
    id: "opencode",
    name: "OpenCode",
    cli: "opencode",
    authPaths: ["~/.config/opencode", "~/.local/share/opencode"],
    authPath: "~/.config/opencode",
    dataPaths: [],
    logPaths: ["~/.local/share/opencode"],
    connectionHint:
      "Install OpenCode, then run `opencode auth login` or choose provider in OpenCode.",
    loginCommand: "opencode auth login",
  },
};

const WINDOW_DEFS: Record<WindowKey, { title: string; ms: number }> = {
  fiveHour: { title: "5 hour", ms: 5 * 60 * 60 * 1000 },
  weekly: { title: "Weekly", ms: 7 * 24 * 60 * 60 * 1000 },
  monthly: { title: "Monthly", ms: 30 * 24 * 60 * 60 * 1000 },
};

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(loadAgentStatuses);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search..."
    >
      {data?.map((agent) => (
        <List.Item
          key={agent.id}
          title={agent.name}
          subtitle={
            agent.connected ? usageSubtitle(agent) : agent.connectionHint
          }
          icon={{
            source: agent.connected
              ? Icon.CircleProgress100
              : Icon.CircleDisabled,
            tintColor: agent.connected ? Color.Green : Color.SecondaryText,
          }}
          accessories={agentAccessories(agent)}
          detail={<AgentDetail agent={agent} />}
          actions={<AgentActions agent={agent} onRefresh={revalidate} />}
        />
      ))}
    </List>
  );
}

function AgentActions({
  agent,
  onRefresh,
}: {
  agent: AgentStatus;
  onRefresh: () => void;
}) {
  return (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
      <Action
        title="Open Login in Terminal"
        icon={Icon.Terminal}
        onAction={() => openTerminal(agent.loginCommand)}
      />
      <Action
        title="Open Config File"
        icon={Icon.Gear}
        onAction={openConfigFile}
      />
      <Action.CopyToClipboard
        title="Copy Login Command"
        content={agent.loginCommand}
      />
    </ActionPanel>
  );
}

function AgentDetail({ agent }: { agent: AgentStatus }) {
  const markdown = [
    agent.connected
      ? `### ${agent.name} is connected`
      : `### ${agent.name} is not running`,
    agent.connected
      ? "Local usage is read from CLI logs."
      : agent.connectionHint,
    "",
    ...agent.notes.map((note) => `- ${note}`),
  ].join("\n");

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Plan"
            text={agent.connected ? "Connected" : "Not Running"}
          />
          <List.Item.Detail.Metadata.Label title="CLI" text={agent.cli} />
          <List.Item.Detail.Metadata.Label
            title="Auth"
            text={agent.authPath ?? "unknown"}
          />
          <List.Item.Detail.Metadata.Separator />
          {detailRows(agent).map((row) => (
            <List.Item.Detail.Metadata.Label
              key={row.title}
              title={row.title}
              text={row.text}
            />
          ))}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Config"
            text="Actions -> Open Config File"
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

async function loadAgentStatuses(): Promise<AgentStatus[]> {
  const preferences = getPreferenceValues<Preferences.AgentUsage>();
  const config = await readConfig(preferences);
  await ensureConfigFile(preferences, config);

  const entries = Object.keys(AGENTS) as AgentId[];
  return Promise.all(entries.map((id) => loadAgent(id, preferences, config)));
}

async function loadAgent(
  id: AgentId,
  preferences: Preferences.AgentUsage,
  config: AgentConfig,
): Promise<AgentStatus> {
  const agent = AGENTS[id];
  const authPaths = [
    ...agent.authPaths,
    ...(config.paths?.[id]?.auth ?? []),
  ].map(expandHome);
  const logPaths = [...agent.logPaths, ...(config.paths?.[id]?.logs ?? [])].map(
    expandHome,
  );
  const cliConnected = await commandExists(agent.cli);
  const authPath = authPaths.find(pathExists);
  const connected = cliConnected && Boolean(authPath);
  const sinceMonthly = new Date(Date.now() - WINDOW_DEFS.monthly.ms);
  const events = await readUsageEvents(id, logPaths, sinceMonthly);
  const limits = limitsFor(id, preferences, config);

  return {
    id,
    name: agent.name,
    cli: agent.cli,
    connected,
    authPath: authPath ? shrinkHome(authPath) : agent.authPath,
    dataPaths: logPaths.map(shrinkHome),
    connectionHint: cliConnected
      ? agent.connectionHint
      : `CLI not found. ${agent.connectionHint}`,
    loginCommand: agent.loginCommand,
    windows: buildWindows(id, events, limits),
    notes: notesFor(id, events.length),
  };
}

async function readUsageEvents(
  id: AgentId,
  roots: string[],
  since: Date,
): Promise<{ at: Date; tokens: number }[]> {
  if (id === "opencode") {
    const stats = await readOpenCodeStats();
    if (stats.length > 0) return stats;
  }

  const files: string[] = [];
  for (const root of roots) collectJsonFiles(root, files, since);

  const events: { at: Date; tokens: number }[] = [];
  for (const file of files) {
    try {
      const content = await fs.promises.readFile(file, "utf8");
      const fallbackAt = new Date((await fs.promises.stat(file)).mtimeMs);
      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line) as unknown;
          const at = extractDate(json) ?? fallbackAt;
          if (at < since) continue;
          const tokens = extractTokens(json);
          if (tokens > 0) events.push({ at, tokens });
        } catch {
          // Ignore partial or non-JSON log lines.
        }
      }
    } catch {
      // Ignore unreadable log files.
    }
  }
  return events;
}

async function readOpenCodeStats(): Promise<{ at: Date; tokens: number }[]> {
  try {
    const { stdout } = await execFileAsync("opencode", ["stats", "--json"], {
      timeout: 3000,
    });
    const parsed = JSON.parse(stdout) as unknown;
    const events = flattenStats(parsed);
    return events;
  } catch {
    return [];
  }
}

function flattenStats(value: unknown): { at: Date; tokens: number }[] {
  const events: { at: Date; tokens: number }[] = [];

  function visit(node: unknown) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    const record = node as Record<string, unknown>;
    const at = extractDate(record);
    const tokens = extractTokens(record);
    if (at && tokens > 0) events.push({ at, tokens });
    for (const item of Object.values(record)) visit(item);
  }

  visit(value);
  return dedupeEvents(events);
}

function collectJsonFiles(root: string, output: string[], since: Date) {
  try {
    if (!fs.existsSync(root)) return;
    const stat = fs.statSync(root);
    if (stat.isFile()) {
      if (
        stat.mtime >= since &&
        (root.endsWith(".jsonl") || root.endsWith(".json"))
      )
        output.push(root);
      return;
    }
    if (!stat.isDirectory()) return;
    if (
      stat.mtime < since &&
      !root.endsWith(".claude") &&
      !root.endsWith(".codex") &&
      !root.endsWith(".gemini")
    )
      return;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      collectJsonFiles(path.join(root, entry.name), output, since);
    }
  } catch {
    // Permission denied or transient file. Ignore.
  }
}

function extractTokens(value: unknown): number {
  const seen = new WeakSet<object>();

  function visit(node: unknown): number {
    if (!node || typeof node !== "object") return 0;
    if (seen.has(node)) return 0;
    seen.add(node);
    if (Array.isArray(node)) return Math.max(0, ...node.map(visit));

    const record = node as Record<string, unknown>;
    const usage = tokenSum(record);
    const childMax = Math.max(0, ...Object.values(record).map(visit));
    return Math.max(usage, childMax);
  }

  return visit(value);
}

function tokenSum(record: Record<string, unknown>): number {
  const keys = [
    "input_tokens",
    "output_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
    "cached_tokens",
    "prompt_tokens",
    "completion_tokens",
    "total_tokens",
    "tokens",
  ];
  const totalToken = numberValue(record.total_tokens);
  if (totalToken > 0) return totalToken;
  return keys.reduce((sum, key) => sum + numberValue(record[key]), 0);
}

function extractDate(value: unknown): Date | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const candidates = [
    record.timestamp,
    record.created_at,
    record.createdAt,
    record.time,
    record.date,
    record.started_at,
    record.updated_at,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const date = new Date(candidate);
      if (!Number.isNaN(date.getTime())) return date;
    }
    if (typeof candidate === "number") {
      const date = new Date(
        candidate > 10_000_000_000 ? candidate : candidate * 1000,
      );
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return undefined;
}

function buildWindows(
  id: AgentId,
  events: { at: Date; tokens: number }[],
  limits: Record<WindowKey, number>,
): Record<WindowKey, UsageWindow> {
  const now = Date.now();
  const supported: Record<AgentId, WindowKey[]> = {
    claude: ["fiveHour", "weekly", "monthly"],
    codex: ["fiveHour", "weekly"],
    gemini: ["fiveHour", "weekly", "monthly"],
    opencode: ["fiveHour", "weekly", "monthly"],
  };

  return Object.fromEntries(
    (Object.keys(WINDOW_DEFS) as WindowKey[]).map((key) => {
      const def = WINDOW_DEFS[key];
      const unsupportedResetAt = new Date(now + def.ms);
      if (!supported[id].includes(key)) {
        return [
          key,
          {
            title: def.title,
            usedTokens: 0,
            limitTokens: 0,
            resetAt: unsupportedResetAt,
            supported: false,
          },
        ];
      }
      const start = now - def.ms;
      const windowEvents = events.filter(
        (event) => event.at.getTime() >= start,
      );
      const usedTokens = windowEvents.reduce(
        (sum, event) => sum + event.tokens,
        0,
      );
      const oldestEventTime = windowEvents.reduce(
        (oldest, event) => Math.min(oldest, event.at.getTime()),
        Number.POSITIVE_INFINITY,
      );
      const resetAt = new Date(
        Number.isFinite(oldestEventTime)
          ? oldestEventTime + def.ms
          : now + def.ms,
      );
      const limitTokens = limits[key];
      return [
        key,
        {
          title: def.title,
          usedTokens,
          limitTokens,
          percent:
            limitTokens > 0
              ? Math.min(999, (usedTokens / limitTokens) * 100)
              : undefined,
          resetAt,
          supported: true,
        },
      ];
    }),
  ) as Record<WindowKey, UsageWindow>;
}

function limitsFor(
  id: AgentId,
  preferences: Preferences.AgentUsage,
  config: AgentConfig,
): Record<WindowKey, number> {
  const prefLimits: Record<AgentId, Record<WindowKey, number>> = {
    claude: {
      fiveHour: parseLimit(preferences.claudeFiveHourLimit),
      weekly: parseLimit(preferences.claudeWeeklyLimit),
      monthly: parseLimit(preferences.claudeMonthlyLimit),
    },
    codex: {
      fiveHour: parseLimit(preferences.codexFiveHourLimit),
      weekly: parseLimit(preferences.codexWeeklyLimit),
      monthly: 0,
    },
    gemini: {
      fiveHour: parseLimit(preferences.geminiFiveHourLimit),
      weekly: parseLimit(preferences.geminiWeeklyLimit),
      monthly: parseLimit(preferences.geminiMonthlyLimit),
    },
    opencode: {
      fiveHour: parseLimit(preferences.opencodeFiveHourLimit),
      weekly: parseLimit(preferences.opencodeWeeklyLimit),
      monthly: parseLimit(preferences.opencodeMonthlyLimit),
    },
  };
  return { ...prefLimits[id], ...config.limits?.[id] };
}

function agentAccessories(agent: AgentStatus): List.Item.Accessory[] {
  return (Object.keys(agent.windows) as WindowKey[])
    .filter((key) => agent.windows[key].supported)
    .map((key) => {
      const window = agent.windows[key];
      const remaining = remainingPercent(window);
      const text =
        remaining === undefined
          ? `${window.title}: ${formatTokens(window.usedTokens)}`
          : `${remaining.toFixed(0)}%`;
      return {
        text,
        icon: {
          source: Icon.CircleProgress,
          tintColor: colorForRemaining(remaining),
        },
      };
    });
}

function detailRows(agent: AgentStatus): { title: string; text: string }[] {
  return (Object.keys(agent.windows) as WindowKey[]).flatMap((key) => {
    const window = agent.windows[key];
    if (!window.supported) return [];
    const remaining = remainingPercent(window);
    const limitText =
      remaining === undefined
        ? `${formatTokens(window.usedTokens)} used, limit not set`
        : `${usageBar(remaining)} ${remaining.toFixed(1)}% remaining (${formatTokens(window.usedTokens)} / ${formatTokens(window.limitTokens)})`;
    return [
      { title: limitTitle(key), text: limitText },
      { title: "Resets In", text: timeUntil(window.resetAt) },
    ];
  });
}

function usageSubtitle(agent: AgentStatus): string {
  const parts = (Object.keys(agent.windows) as WindowKey[])
    .filter((key) => agent.windows[key].supported)
    .map((key) => {
      const window = agent.windows[key];
      const remaining = remainingPercent(window);
      const percentText =
        remaining === undefined
          ? "limit unset"
          : `${remaining.toFixed(1)}% remaining`;
      return `${window.title} ${percentText}, ${timeUntil(window.resetAt)} left`;
    });
  return parts.join(" · ");
}

function remainingPercent(window: UsageWindow): number | undefined {
  if (window.percent === undefined) return undefined;
  return Math.max(0, Math.min(100, 100 - window.percent));
}

function colorForRemaining(percent?: number): Color {
  if (percent === undefined) return Color.SecondaryText;
  if (percent <= 10) return Color.Red;
  if (percent <= 30) return Color.Orange;
  return Color.Green;
}

function usageBar(remaining: number): string {
  const filled = Math.round((remaining / 100) * 14);
  return `${"/".repeat(filled)}${"-".repeat(14 - filled)}`;
}

function limitTitle(key: WindowKey): string {
  if (key === "fiveHour") return "5h Limit";
  if (key === "weekly") return "Weekly Limit";
  return "Monthly Limit";
}

function notesFor(id: AgentId, eventCount: number): string[] {
  const notes = [
    `Read ${eventCount} local usage events. No cloud APIs are called.`,
  ];
  if (id === "claude")
    notes.push(
      "Claude Code JSONL token fields can be approximate depending on version and streaming mode.",
    );
  if (id === "codex")
    notes.push(
      "Codex commonly exposes 5 hour and weekly windows; monthly window is hidden here.",
    );
  if (id === "gemini")
    notes.push(
      "Gemini CLI local usage logs vary by version. Add custom log paths in config if needed.",
    );
  if (id === "opencode")
    notes.push(
      "OpenCode uses `opencode stats --json` first, then local data fallback.",
    );
  return notes;
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync(
      "/bin/zsh",
      ["-lc", `command -v ${shellQuote(command)}`],
      { timeout: 1500 },
    );
    return true;
  } catch {
    return false;
  }
}

async function openTerminal(command: string) {
  const script = `tell application "Terminal"\nactivate\ndo script ${JSON.stringify(command)}\nend tell`;
  await execFileAsync("osascript", ["-e", script]);
}

async function openConfigFile() {
  const preferences = getPreferenceValues<Preferences.AgentUsage>();
  const configPath = getConfigPath(preferences);
  await ensureConfigFile(preferences, await readConfig(preferences));
  await open(configPath);
}

async function readConfig(
  preferences: Preferences.AgentUsage,
): Promise<AgentConfig> {
  const configPath = getConfigPath(preferences);
  try {
    return JSON.parse(
      await fs.promises.readFile(configPath, "utf8"),
    ) as AgentConfig;
  } catch {
    return {};
  }
}

async function ensureConfigFile(
  preferences: Preferences.AgentUsage,
  config: AgentConfig,
) {
  const configPath = getConfigPath(preferences);
  if (fs.existsSync(configPath)) return;
  await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
  const seed: AgentConfig = {
    ...config,
    paths: {
      claude: {
        logs: ["~/.claude/projects"],
        auth: ["~/.claude/.credentials.json", "~/.claude.json"],
      },
      codex: { logs: ["~/.codex/sessions"], auth: ["~/.codex/auth.json"] },
      gemini: { logs: ["~/.gemini"], auth: ["~/.gemini/oauth_creds.json"] },
      opencode: {
        logs: ["~/.local/share/opencode"],
        auth: ["~/.config/opencode", "~/.local/share/opencode"],
      },
    },
    limits: config.limits ?? {},
  };
  await fs.promises.writeFile(
    configPath,
    `${JSON.stringify(seed, null, 2)}\n`,
    "utf8",
  );
}

function getConfigPath(preferences: Preferences.AgentUsage): string {
  return expandHome(
    preferences.customConfigPath?.trim() ||
      path.join(environment.supportPath, "config.json"),
  );
}

function dedupeEvents(events: { at: Date; tokens: number }[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.at.toISOString()}:${event.tokens}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseLimit(value: string): number {
  return Math.max(0, Number(value.replace(/,/g, "")) || 0);
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toLocaleString();
}

function timeUntil(date: Date): string {
  const ms = Math.max(0, date.getTime() - Date.now());
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function pathExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function expandHome(filePath: string): string {
  if (filePath === "~") return home;
  if (filePath.startsWith("~/")) return path.join(home, filePath.slice(2));
  return filePath;
}

function shrinkHome(filePath: string): string {
  if (filePath.startsWith(home)) return `~${filePath.slice(home.length)}`;
  return filePath;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
