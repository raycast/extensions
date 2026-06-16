import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  environment,
  getPreferenceValues,
  open,
  popToRoot,
  showToast,
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
  resetAt?: Date;
  supported: boolean;
};

type AccountUsageWindow = {
  label: string;
  usedPercent: number;
  resetInSeconds?: number;
};

type AccountUsage = {
  planName?: string;
  windows: AccountUsageWindow[];
  creditsBalance?: string;
};

type AgentStatus = {
  id: AgentId;
  name: string;
  cli: string;
  cliInstalled: boolean;
  connected: boolean;
  authPath?: string;
  dataPaths: string[];
  installUrl: string;
  usageUrl?: string;
  accountManaged: boolean;
  accountUsage?: AccountUsage;
  accountError?: string;
  loginCommand: string;
  windows: Record<WindowKey, UsageWindow>;
  notes: string[];
};

type AgentId = "claude" | "codex" | "gemini" | "opencode";

type AgentConfig = {
  paths?: Partial<Record<AgentId, { auth?: string[]; logs?: string[] }>>;
};

type OpenCodeGoSetup = {
  workspaceId: string;
  authCookie: string;
};

const OPENCODE_GO_SETUP_KEY = "opencode-go-setup";

const home = os.homedir();

const AGENTS: Record<
  AgentId,
  Omit<AgentStatus, "cliInstalled" | "connected" | "windows" | "notes"> & {
    authPaths: string[];
    logPaths: string[];
  }
> = {
  claude: {
    id: "claude",
    name: "Claude",
    cli: "claude",
    authPaths: ["~/.claude/.credentials.json", "~/.claude.json"],
    authPath: "~/.claude/.credentials.json",
    dataPaths: [],
    logPaths: ["~/.claude/projects"],
    installUrl: "https://docs.anthropic.com/en/docs/claude-code/setup",
    accountManaged: false,
    loginCommand: "claude",
  },
  codex: {
    id: "codex",
    name: "Codex",
    cli: "codex",
    authPaths: ["~/.codex/auth.json"],
    authPath: "~/.codex/auth.json",
    dataPaths: [],
    logPaths: ["~/.codex/sessions"],
    installUrl: "https://developers.openai.com/codex/cli",
    usageUrl: "https://chatgpt.com/codex/settings/usage",
    accountManaged: true,
    loginCommand: "codex login",
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    cli: "gemini",
    authPaths: ["~/.gemini/oauth_creds.json", "~/.gemini/settings.json"],
    authPath: "~/.gemini/oauth_creds.json",
    dataPaths: [],
    logPaths: ["~/.gemini"],
    installUrl: "https://github.com/google-gemini/gemini-cli",
    accountManaged: false,
    loginCommand: "gemini auth login",
  },
  opencode: {
    id: "opencode",
    name: "OpenCode Go",
    cli: "opencode",
    authPaths: ["~/.config/opencode", "~/.local/share/opencode"],
    authPath: "~/.config/opencode",
    dataPaths: [],
    logPaths: ["~/.local/share/opencode"],
    installUrl: "https://opencode.ai/docs/",
    usageUrl: "https://opencode.ai/auth",
    accountManaged: true,
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
  const agents = data ?? [];
  const connectedAgents = agents.filter((agent) => agent.connected);
  const disconnectedAgents = agents.filter((agent) => !agent.connected);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search..."
    >
      {connectedAgents.length === 0 && disconnectedAgents.length > 0 ? (
        <List.Section title="Connect">
          {disconnectedAgents.map((agent) => (
            <AgentListItem
              key={agent.id}
              agent={agent}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      ) : null}
      {connectedAgents.length > 0 ? (
        <List.Section title="Usage">
          {connectedAgents.map((agent) => (
            <AgentListItem
              key={agent.id}
              agent={agent}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      ) : null}
      {disconnectedAgents.length > 0 && connectedAgents.length > 0 ? (
        <List.Section title="Connect More">
          {disconnectedAgents.map((agent) => (
            <AgentListItem
              key={agent.id}
              agent={agent}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function AgentListItem({
  agent,
  onRefresh,
}: {
  agent: AgentStatus;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      title={agent.name}
      icon={{
        source: agent.connected ? Icon.CircleProgress100 : Icon.Link,
        tintColor: agent.connected ? Color.Green : Color.Blue,
      }}
      accessories={agentAccessories(agent)}
      detail={
        agent.connected ? (
          <AgentDetail agent={agent} />
        ) : (
          <ConnectionDetail agent={agent} />
        )
      }
      actions={<AgentActions agent={agent} onRefresh={onRefresh} />}
    />
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
      {agent.connected && agent.usageUrl ? (
        <Action
          title="Open Usage Dashboard"
          icon={Icon.BarChart}
          onAction={() => open(agent.usageUrl!)}
        />
      ) : null}
      {agent.id === "opencode" ? (
        <Action.Push
          title={
            agent.accountUsage ? "Edit Opencode Go Setup" : "Set up Opencode Go"
          }
          icon={Icon.Pencil}
          target={<OpenCodeGoSetupForm onSaved={onRefresh} />}
        />
      ) : null}
      {agent.connected ? (
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={onRefresh}
        />
      ) : (
        <Action
          title={primaryConnectionActionTitle(agent)}
          icon={Icon.Link}
          onAction={() => openConnectionAction(agent)}
        />
      )}
      <Action
        title="Open Config File"
        icon={Icon.Gear}
        onAction={openConfigFile}
      />
      {!agent.connected && agent.usageUrl ? (
        <Action
          title="Open Usage Dashboard"
          icon={Icon.BarChart}
          onAction={() => open(agent.usageUrl!)}
        />
      ) : null}
      <Action.CopyToClipboard
        title="Copy Login Command"
        content={agent.loginCommand}
      />
      {!agent.connected ? (
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={onRefresh}
        />
      ) : null}
    </ActionPanel>
  );
}

function AgentDetail({ agent }: { agent: AgentStatus }) {
  return <List.Item.Detail markdown={usageMarkdown(agent)} />;
}

function usageMarkdown(agent: AgentStatus): string {
  if (agent.accountManaged) return accountManagedMarkdown(agent);

  const windows = (Object.keys(agent.windows) as WindowKey[]).filter(
    (key) => agent.windows[key].supported,
  );
  const primary = agent.windows.fiveHour.supported
    ? agent.windows.fiveHour
    : agent.windows[windows[0]];
  const blocks = windows.map((key) => {
    const window = agent.windows[key];
    return [
      `### ${shortWindowTitle(key)}`,
      `**${formatTokens(window.usedTokens)} used**`,
      resetLine(window),
    ].join("\n");
  });
  const resetSummary = primary.resetAt
    ? `resets in ${timeUntil(primary.resetAt)}`
    : "reset shown by provider";

  return [
    `# ${agent.name}`,
    "",
    `## ${formatTokens(primary.usedTokens)} used`,
    `${primary.title} window · ${resetSummary}`,
    "",
    "---",
    "",
    ...blocks.flatMap((block) => [block, ""]),
    "",
    "---",
    "",
    "Provider dashboards are the source of truth for remaining quota and reset times.",
  ].join("\n");
}

function accountManagedMarkdown(agent: AgentStatus): string {
  if (agent.accountUsage) {
    const primary = agent.accountUsage.windows[0];
    const blocks = agent.accountUsage.windows.map((window) => {
      const remaining = Math.max(0, 100 - window.usedPercent);
      return [
        `### ${window.label}`,
        `**${remaining}% remaining**`,
        usageMeter(remaining),
        `${window.usedPercent}% used${window.resetInSeconds ? ` · resets in ${formatSeconds(window.resetInSeconds)}` : ""}`,
      ].join("\n");
    });

    return [
      `# ${agent.name}`,
      "",
      `## ${Math.max(0, 100 - primary.usedPercent)}% remaining`,
      `${primary.label}${primary.resetInSeconds ? ` · resets in ${formatSeconds(primary.resetInSeconds)}` : ""}`,
      "",
      "---",
      "",
      ...blocks.flatMap((block) => [block, ""]),
      agent.accountUsage.creditsBalance !== undefined
        ? `Credits: ${agent.accountUsage.creditsBalance}`
        : "",
    ]
      .filter((line) => line !== "")
      .join("\n");
  }

  return [
    `# ${agent.name}`,
    "",
    "## Account Usage Unavailable",
    agent.accountError || "Could not fetch provider usage.",
    "",
    agent.id === "opencode"
      ? "Use the OpenCode Go row action to set it up here once. BubbleUsage saves it locally and reuses it until the cookie expires."
      : "Run the login command, then refresh.",
  ].join("\n");
}

function ConnectionDetail({ agent }: { agent: AgentStatus }) {
  const markdown = [
    `# ${agent.name}`,
    "",
    `## ${agent.cliInstalled ? "Connect Account" : "Install CLI"}`,
    setupSummary(agent),
    "",
    agent.cliInstalled
      ? "After sign-in, refresh to start tracking usage."
      : "Install it once, then come back here to connect.",
  ].join("\n");

  return <List.Item.Detail markdown={markdown} />;
}

function OpenCodeGoSetupForm({ onSaved }: { onSaved: () => void }) {
  async function save(values: { workspaceId: string; authCookie: string }) {
    const workspaceId = values.workspaceId.trim();
    const authCookie = extractAuthCookie(values.authCookie);

    if (!workspaceId || !authCookie) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing setup values",
        message: "Paste the workspace ID and auth cookie.",
      });
      return;
    }

    await LocalStorage.setItem(
      OPENCODE_GO_SETUP_KEY,
      JSON.stringify({ workspaceId, authCookie } satisfies OpenCodeGoSetup),
    );
    await showToast({
      style: Toast.Style.Success,
      title: "OpenCode Go setup saved",
    });
    onSaved();
    await popToRoot();
  }

  return (
    <Form
      navigationTitle="Set Up OpenCode Go"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Setup"
            icon={Icon.CheckCircle}
            onSubmit={save}
          />
          <Action.OpenInBrowser
            title="Open Opencode Go"
            url="https://opencode.ai/auth"
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Open your OpenCode Go dashboard, copy the workspace ID from the URL, then paste the auth cookie. You can paste either the raw auth value or the full Cookie header." />
      <Form.Description text="This is saved locally in Raycast. You only need to update it again if the OpenCode website session expires." />
      <Form.TextField
        id="workspaceId"
        title="Workspace ID"
        placeholder="wrk_abc123 or abc123"
      />
      <Form.PasswordField
        id="authCookie"
        title="Auth Cookie"
        placeholder="auth cookie value or full Cookie header"
      />
    </Form>
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
  const openCodeGoSetup =
    id === "opencode" ? await readOpenCodeGoSetup(preferences) : undefined;
  const accountUsageResult = connected
    ? await readAccountUsage(id, preferences, openCodeGoSetup)
    : { usage: undefined, error: undefined };
  const usageUrl =
    id === "opencode"
      ? openCodeGoDashboardUrl(openCodeGoSetup)
      : agent.usageUrl;

  return {
    id,
    name: agent.name,
    cli: agent.cli,
    cliInstalled: cliConnected,
    connected,
    authPath: authPath ? shrinkHome(authPath) : agent.authPath,
    dataPaths: logPaths.map(shrinkHome),
    installUrl: agent.installUrl,
    usageUrl,
    accountManaged: agent.accountManaged,
    accountUsage: accountUsageResult.usage,
    accountError: accountUsageResult.error,
    loginCommand: agent.loginCommand,
    windows: buildWindows(id, events),
    notes: notesFor(id, events.length),
  };
}

async function readAccountUsage(
  id: AgentId,
  preferences: Preferences.AgentUsage,
  openCodeGoSetup?: OpenCodeGoSetup,
): Promise<{ usage?: AccountUsage; error?: string }> {
  if (id === "codex") return readCodexAccountUsage();
  if (id === "opencode") return readOpenCodeGoAccountUsage(openCodeGoSetup);
  return {};
}

async function readCodexAccountUsage(): Promise<{
  usage?: AccountUsage;
  error?: string;
}> {
  const token = await readCodexToken();
  if (!token) return { error: "Run `codex login` to fetch account usage." };

  try {
    const response = await fetch("https://chatgpt.com/backend-api/wham/usage", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!response.ok)
      return { error: `Codex usage request failed: ${response.status}` };
    const data = (await response.json()) as Record<string, unknown>;
    const rateLimit = objectValue(data.rate_limit);
    const primary = objectValue(rateLimit?.primary_window);
    const secondary = objectValue(rateLimit?.secondary_window);
    if (!primary || !secondary)
      return { error: "Codex usage response missing limits." };
    const credits = objectValue(data.credits);
    return {
      usage: {
        planName: stringValue(data.plan_type) || "Codex",
        creditsBalance: stringValue(credits?.balance),
        windows: [
          {
            label: "5h limit",
            usedPercent: numberValue(primary.used_percent),
            resetInSeconds: numberValue(primary.reset_after_seconds),
          },
          {
            label: "Weekly limit",
            usedPercent: numberValue(secondary.used_percent),
            resetInSeconds: numberValue(secondary.reset_after_seconds),
          },
        ],
      },
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Codex usage request failed.",
    };
  }
}

async function readOpenCodeGoAccountUsage(
  setup?: OpenCodeGoSetup,
): Promise<{ usage?: AccountUsage; error?: string }> {
  const workspaceId = setup?.workspaceId;
  const authCookie = setup?.authCookie;
  if (!workspaceId || !authCookie) {
    return {
      error:
        "Set OpenCode Go Workspace ID and Auth Cookie in extension settings.",
    };
  }

  try {
    const response = await fetch(openCodeGoDashboardUrl(setup), {
      headers: {
        Cookie: `auth=${authCookie}`,
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });
    if (response.status === 401 || response.status === 403) {
      return { error: "OpenCode Go auth cookie expired or invalid." };
    }
    if (!response.ok)
      return { error: `OpenCode Go request failed: ${response.status}` };
    const html = await response.text();
    const usage = parseOpenCodeGoUsage(html);
    if (!usage)
      return {
        error: "Could not find OpenCode Go usage data in dashboard HTML.",
      };
    return { usage };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "OpenCode Go usage request failed.",
    };
  }
}

async function readCodexToken(): Promise<string | undefined> {
  try {
    const authPath = path.join(home, ".codex", "auth.json");
    const parsed = JSON.parse(await fs.promises.readFile(authPath, "utf8")) as {
      tokens?: { access_token?: string };
    };
    return parsed.tokens?.access_token?.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function readOpenCodeGoSetup(
  preferences: Preferences.AgentUsage,
): Promise<OpenCodeGoSetup | undefined> {
  const stored = await LocalStorage.getItem<string>(OPENCODE_GO_SETUP_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as OpenCodeGoSetup;
      if (parsed.workspaceId?.trim() && parsed.authCookie?.trim()) {
        return {
          workspaceId: parsed.workspaceId.trim(),
          authCookie: extractAuthCookie(parsed.authCookie),
        };
      }
    } catch {
      // Ignore malformed local setup and fall back to preferences.
    }
  }

  const workspaceId = preferences.opencodegoWorkspaceId?.trim();
  const authCookie = extractAuthCookie(preferences.opencodegoAuthCookie);
  if (!workspaceId || !authCookie) return undefined;
  return { workspaceId, authCookie };
}

function openCodeGoDashboardUrl(setup?: OpenCodeGoSetup): string {
  const rawId = setup?.workspaceId?.trim();
  if (!rawId) return "https://opencode.ai/auth";
  const workspaceId = rawId.startsWith("wrk_") ? rawId : `wrk_${rawId}`;
  return `https://opencode.ai/workspace/${workspaceId}/go`;
}

function extractAuthCookie(value?: string): string {
  const trimmed = value?.trim() ?? "";
  const match = trimmed.match(/(?:^|;\s*)auth=([^;]+)/);
  return (match?.[1] ?? trimmed).trim();
}

function parseOpenCodeGoUsage(html: string): AccountUsage | undefined {
  const script = html.match(/<script>self\.\$R=[\s\S]*?<\/script>/)?.[0];
  if (!script) return undefined;

  const rolling = parseOpenCodeGoQuota(script, "rollingUsage");
  const weekly = parseOpenCodeGoQuota(script, "weeklyUsage");
  const monthly = parseOpenCodeGoQuota(script, "monthlyUsage");
  const windows = [
    rolling ? { label: "Rolling", ...rolling } : undefined,
    weekly ? { label: "Weekly", ...weekly } : undefined,
    monthly ? { label: "Monthly", ...monthly } : undefined,
  ].filter(Boolean) as AccountUsageWindow[];
  if (windows.length === 0) return undefined;

  const planName = script.includes('subscriptionPlan:"go"')
    ? "OpenCode Go"
    : "OpenCode Go";
  return { planName, windows };
}

function parseOpenCodeGoQuota(
  script: string,
  field: string,
): Pick<AccountUsageWindow, "usedPercent" | "resetInSeconds"> | undefined {
  const match = script.match(
    new RegExp(`${field}:\\$R\\[\\d+\\]=\\{([^}]+)\\}`),
  );
  if (!match) return undefined;
  return {
    usedPercent: Number.parseInt(
      match[1].match(/usagePercent:(\d+)/)?.[1] || "0",
      10,
    ),
    resetInSeconds: Number.parseInt(
      match[1].match(/resetInSec:(\d+)/)?.[1] || "0",
      10,
    ),
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
      if (!supported[id].includes(key)) {
        return [
          key,
          {
            title: def.title,
            usedTokens: 0,
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
      const resetAt =
        id !== "opencode" && Number.isFinite(oldestEventTime)
          ? new Date(oldestEventTime + def.ms)
          : undefined;
      return [
        key,
        {
          title: def.title,
          usedTokens,
          resetAt,
          supported: true,
        },
      ];
    }),
  ) as Record<WindowKey, UsageWindow>;
}

function agentAccessories(agent: AgentStatus): List.Item.Accessory[] {
  if (agent.connected) {
    const accountRemaining = agent.accountUsage?.windows[0]
      ? `${Math.max(0, 100 - agent.accountUsage.windows[0].usedPercent)}%`
      : undefined;
    return [
      {
        text: accountRemaining ?? (agent.accountManaged ? "Setup" : "Active"),
        icon: {
          source: agent.accountManaged ? Icon.BarChart : Icon.CheckCircle,
          tintColor: accountRemaining
            ? colorForRemaining(Number.parseInt(accountRemaining, 10))
            : Color.Green,
        },
      },
    ];
  }

  return [
    {
      text: agent.cliInstalled ? "Connect" : "Install CLI",
      icon: { source: Icon.Link, tintColor: Color.Blue },
    },
  ];
}

function primaryConnectionActionTitle(agent: AgentStatus): string {
  if (!agent.cliInstalled) return `Install ${agent.name} CLI`;
  return `Connect ${agent.name}`;
}

function setupSummary(agent: AgentStatus): string {
  if (!agent.cliInstalled)
    return `Open the official ${agent.name} CLI install page.`;
  return "Opens the official sign-in flow. Most providers finish in the browser.";
}

async function openConnectionAction(agent: AgentStatus) {
  if (!agent.cliInstalled) {
    await open(agent.installUrl);
    return;
  }
  await openTerminal(agent.loginCommand);
}

function shortWindowTitle(key: WindowKey): string {
  if (key === "fiveHour") return "5h";
  if (key === "weekly") return "7d";
  return "30d";
}

function resetLine(window: UsageWindow): string {
  if (!window.resetAt) return "Reset: provider dashboard";
  return `Resets in ${timeUntil(window.resetAt)}`;
}

function notesFor(id: AgentId, eventCount: number): string[] {
  const notes = [
    `${eventCount} local events read.`,
    "Account limits are provider-managed.",
  ];
  if (id === "claude")
    notes.push("Claude token fields may vary by CLI version.");
  if (id === "codex") notes.push("Codex monthly window is hidden.");
  if (id === "gemini") notes.push("Gemini log paths can vary by version.");
  if (id === "opencode") notes.push("Uses `opencode stats` first.");
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

function objectValue(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function colorForRemaining(percent: number): Color {
  if (percent <= 10) return Color.Red;
  if (percent <= 30) return Color.Orange;
  return Color.Green;
}

function usageMeter(remaining: number): string {
  const safeRemaining = Math.max(0, Math.min(100, remaining));
  const filled = Math.round((safeRemaining / 100) * 18);
  return `[${"#".repeat(filled)}${"-".repeat(18 - filled)}]`;
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

function formatSeconds(seconds: number): string {
  return timeUntil(new Date(Date.now() + seconds * 1000));
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
