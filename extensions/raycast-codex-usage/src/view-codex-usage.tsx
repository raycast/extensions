import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise, getProgressIcon } from "@raycast/utils";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type RateLimitWindow = {
  usedPercent: number;
  windowDurationMins: number | null;
  resetsAt: number | null;
};

type RateLimitSnapshot = {
  limitId: string | null;
  limitName: string | null;
  primary: RateLimitWindow | null;
  secondary: RateLimitWindow | null;
  credits: unknown;
  planType: string | null;
  rateLimitReachedType: string | null;
};

type GetAccountRateLimitsResponse = {
  rateLimits: RateLimitSnapshot;
  rateLimitsByLimitId: Record<string, RateLimitSnapshot | undefined> | null;
};

type Skill = {
  name: string;
  description: string;
  interface?: {
    displayName: string;
    shortDescription: string;
  };
  scope: "user" | "system";
  enabled: boolean;
};

type SkillsListEntry = {
  cwd: string;
  skills: Skill[];
  errors: unknown[];
};

type SkillsListResponse = {
  data: SkillsListEntry[];
};

type Thread = {
  id: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  cwd: string;
  source: string;
  name: string | null;
};

type ThreadListResponse = {
  data: Thread[];
  nextCursor: string | null;
  backwardsCursor: string | null;
};

type RpcResponse = {
  id?: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
};

type DisplayWindow = {
  id: string;
  label: string;
  window: RateLimitWindow;
};

type UsageData = {
  rateLimits: GetAccountRateLimitsResponse;
  threads: Thread[];
  skills: Skill[];
};

const REQUEST_TIMEOUT_MS = 20000;
const ACTIVITY_TIMEOUT_MS = 3000;
const THREAD_LIST_LIMIT = 99;
const CODEX_EXECUTABLE_CANDIDATES = [
  "/opt/homebrew/bin/codex",
  "/usr/local/bin/codex",
  "/usr/bin/codex",
  join(homedir(), ".local/bin/codex"),
  join(homedir(), ".npm-global/bin/codex"),
  "codex",
];

export default function Command() {
  const { data, error, isLoading, revalidate } = usePromise(fetchCodexUsage);
  const windows = data ? getCodexWindows(data.rateLimits) : [];
  const activity = data ? getRecentActivity(data.threads) : null;
  const skills = data?.skills ?? [];
  const refresh = () => {
    void revalidate();
  };

  const refreshAction = (
    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} shortcut={{ modifiers: ["cmd"], key: "r" }} />
  );

  if (error) {
    return (
      <Detail
        markdown={`# Unable to load Codex usage\n\n${error.message}\n\nMake sure Codex is installed and signed in with \`codex login\`.`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={refresh} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Rate Limits">
        {windows.map((item) => {
          const remaining = getRemainingPercent(item.window);
          return (
            <List.Item
              key={item.id}
              icon={getProgressIcon(remaining / 100, getRemainingColor(remaining))}
              title={item.label}
              subtitle={
                item.window.resetsAt
                  ? `Resets in ${formatTimeUntil(item.window.resetsAt)} · ${formatResetDate(item.window.resetsAt)}`
                  : undefined
              }
              accessories={[
                { tag: { value: `${formatPercent(remaining)}% remaining`, color: getRemainingColor(remaining) } },
              ]}
              actions={
                <ActionPanel>
                  {refreshAction}
                  <Action.OpenInBrowser
                    title="Open Codex Usage Settings"
                    url="https://chatgpt.com/codex/settings/usage"
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {activity ? (
        <List.Section title="Sessions">
          <List.Item
            icon={Icon.Clock}
            title="Today"
            subtitle={formatSessionCount(activity.todayCount, activity.isPartial)}
            actions={<ActionPanel>{refreshAction}</ActionPanel>}
          />
          <List.Item
            icon={Icon.Calendar}
            title="Last 7 Days"
            subtitle={formatSessionCount(activity.weekCount, activity.isPartial)}
            actions={<ActionPanel>{refreshAction}</ActionPanel>}
          />
          <List.Item
            icon={Icon.Bubble}
            title="Latest Session"
            subtitle={activity.latestTitle}
            accessories={[{ text: formatTimeAgo(activity.latestUpdatedAt) }]}
            actions={<ActionPanel>{refreshAction}</ActionPanel>}
          />
        </List.Section>
      ) : null}
      {skills.length > 0 ? (
        <List.Section title="Skills">
          <List.Item
            icon={Icon.Wand}
            title="Skills"
            accessories={[{ text: String(skills.length) }]}
            actions={
              <ActionPanel>
                <Action.Push title="View Skills" target={<SkillsDetailView skills={skills} />} />
                {refreshAction}
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}

function SkillsDetailView({ skills }: { skills: Skill[] }) {
  const userSkills = skills.filter((s) => s.scope === "user");
  const systemSkills = skills.filter((s) => s.scope === "system");

  return (
    <List navigationTitle="Skills">
      {userSkills.length > 0 ? (
        <List.Section title="Your Skills">
          {userSkills.map((skill) => (
            <List.Item
              key={skill.name}
              icon={Icon.Wand}
              title={skill.interface?.displayName ?? formatSkillName(skill.name)}
              subtitle={skill.interface?.shortDescription}
            />
          ))}
        </List.Section>
      ) : null}
      {systemSkills.length > 0 ? (
        <List.Section title="Built-in">
          {systemSkills.map((skill) => (
            <List.Item
              key={skill.name}
              icon={Icon.Wand}
              title={skill.interface?.displayName ?? formatSkillName(skill.name)}
              subtitle={skill.interface?.shortDescription}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function fetchCodexUsage(): Promise<UsageData> {
  return new Promise((resolve, reject) => {
    const codexExecutable = resolveCodexExecutable();
    const child = spawn(codexExecutable, ["app-server"], {
      env: {
        ...process.env,
        PATH: getExtendedPath(),
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let rateLimits: GetAccountRateLimitsResponse | null = null;
    let threads: Thread[] = [];
    let skills: Skill[] = [];
    let threadListFinished = false;
    let skillsListFinished = false;
    let activityTimeout: NodeJS.Timeout | undefined;

    const timeout = setTimeout(() => {
      finish(new Error("Timed out while waiting for Codex rate limits."));
    }, REQUEST_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      const lines = stdout.split("\n");
      stdout = lines.pop() ?? "";

      for (const line of lines) {
        handleRpcLine(line);
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      if ("code" in error && error.code === "ENOENT") {
        finish(
          new Error(
            `Could not find the Codex CLI. Checked: ${CODEX_EXECUTABLE_CANDIDATES.join(", ")}. Install Codex or add it to a standard PATH location like /opt/homebrew/bin/codex.`,
          ),
        );
        return;
      }

      finish(error);
    });

    child.on("exit", (code) => {
      if (!settled && code !== 0) {
        finish(new Error(`Codex app-server exited with code ${code}.${formatStderr(stderr)}`));
      }
    });

    child.stdin.write(
      JSON.stringify({
        id: 1,
        method: "initialize",
        params: { clientInfo: { name: "raycast-codex-usage", version: "0.0.0" } },
      }) + "\n",
    );

    function handleRpcLine(line: string) {
      let message: RpcResponse;

      try {
        message = JSON.parse(line) as RpcResponse;
      } catch {
        return;
      }

      if (message.id === 1) {
        child.stdin.write(JSON.stringify({ id: 2, method: "account/rateLimits/read" }) + "\n");
        child.stdin.write(
          JSON.stringify({
            id: 3,
            method: "thread/list",
            params: {
              limit: THREAD_LIST_LIMIT,
              sortKey: "updated_at",
              sortDirection: "desc",
              archived: false,
              sourceKinds: ["cli", "vscode", "exec", "appServer"],
            },
          }) + "\n",
        );
        child.stdin.write(JSON.stringify({ id: 4, method: "skills/list", params: { cwd: homedir() } }) + "\n");
        scheduleActivityTimeout();
        return;
      }

      if (message.id !== 2 && message.id !== 3 && message.id !== 4) {
        return;
      }

      if (message.error) {
        if (message.id === 2) {
          finish(new Error(`${message.error.message}.${formatStderr(stderr)}`));
        }
        if (message.id === 3) {
          threadListFinished = true;
          if (rateLimits && skillsListFinished) {
            finish(null, { rateLimits, threads, skills });
          }
        }
        if (message.id === 4) {
          skillsListFinished = true;
          if (rateLimits && threadListFinished) {
            finish(null, { rateLimits, threads, skills });
          }
        }
        return;
      }

      if (!message.result && message.id === 2) {
        finish(new Error("Codex returned an empty rate-limit response."));
        return;
      }

      if (message.id === 2) {
        rateLimits = message.result as GetAccountRateLimitsResponse;
      }

      if (message.id === 3) {
        threads = ((message.result as ThreadListResponse | undefined)?.data ?? []).filter(Boolean);
        threadListFinished = true;
      }

      if (message.id === 4) {
        const entries = (message.result as SkillsListResponse | undefined)?.data ?? [];
        skills = entries.flatMap((entry) => entry.skills).filter((s) => s.enabled);
        skillsListFinished = true;
      }

      if (rateLimits && threadListFinished && skillsListFinished) {
        finish(null, { rateLimits, threads, skills });
      }
    }

    function finish(error: Error | null, result?: UsageData) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      clearTimeout(activityTimeout);
      child.kill();

      if (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to load Codex usage", message: error.message });
        reject(error);
        return;
      }

      resolve(result as UsageData);
    }

    function scheduleActivityTimeout() {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        if (!rateLimits) {
          scheduleActivityTimeout();
          return;
        }

        finish(null, { rateLimits, threads, skills });
      }, ACTIVITY_TIMEOUT_MS);
    }
  });
}

function resolveCodexExecutable(): string {
  for (const candidate of CODEX_EXECUTABLE_CANDIDATES) {
    if (candidate !== "codex" && existsSync(candidate)) {
      return candidate;
    }
  }

  return "codex";
}

function getExtendedPath(): string {
  return [
    process.env.PATH,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    join(homedir(), ".local/bin"),
    join(homedir(), ".npm-global/bin"),
  ]
    .filter(Boolean)
    .join(":");
}

function getCodexWindows(response: GetAccountRateLimitsResponse): DisplayWindow[] {
  const snapshot = getCodexSnapshot(response);
  const candidates = [snapshot.primary, snapshot.secondary].flatMap((window, index) =>
    window ? [{ window, index }] : [],
  );

  if (candidates.length === 0) {
    return [];
  }

  return candidates.map(({ window, index }) => ({
    id: window.windowDurationMins === 300 ? "5h" : window.windowDurationMins === 10080 ? "weekly" : `window-${index}`,
    label: getWindowLabel(window, index),
    window,
  }));
}

function getCodexSnapshot(response: GetAccountRateLimitsResponse): RateLimitSnapshot {
  return response.rateLimitsByLimitId?.codex ?? response.rateLimits;
}

function getRecentActivity(threads: Thread[]) {
  const [latest] = threads;

  if (!latest) {
    return null;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const weekStart = Date.now() / 1000 - 7 * 24 * 60 * 60;

  return {
    latestTitle: latest.name || latest.preview || getDirectoryName(latest.cwd) || "Untitled session",
    latestUpdatedAt: latest.updatedAt,
    todayCount: threads.filter((thread) => thread.updatedAt >= todayStart).length,
    weekCount: threads.filter((thread) => thread.updatedAt >= weekStart).length,
    totalCount: threads.length,
    isPartial: threads.length === THREAD_LIST_LIMIT,
  };
}

function getWindowLabel(window: RateLimitWindow, index: number): string {
  if (window.windowDurationMins === 300) {
    return "5H Limit";
  }

  if (window.windowDurationMins === 10080) {
    return "Weekly Limit";
  }

  if (index === 0) {
    return "Primary Limit";
  }

  if (index === 1) {
    return "Secondary Limit";
  }

  if (window.windowDurationMins) {
    return `${window.windowDurationMins}m Limit`;
  }

  return `Limit ${index + 1}`;
}

function formatSessionCount(count: number, isPartial: boolean): string {
  return `${count}${isPartial ? "+" : ""} ${count === 1 && !isPartial ? "session" : "sessions"}`;
}

function getRemainingColor(remainingPercent: number): Color {
  if (remainingPercent <= 20) {
    return Color.Red;
  }

  if (remainingPercent < 50) {
    return Color.Yellow;
  }

  return Color.Green;
}

function getRemainingPercent(window: RateLimitWindow): number {
  return clampPercent(100 - window.usedPercent);
}

function formatResetDate(timestampSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(timestampSeconds * 1000));
}

function formatTimeUntil(timestampSeconds: number): string {
  const totalMinutes = Math.max(0, Math.round((timestampSeconds * 1000 - Date.now()) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatTimeAgo(timestampSeconds: number): string {
  const diffMinutes = Math.round((timestampSeconds * 1000 - Date.now()) / 60000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 60) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  const absHours = Math.abs(diffHours);

  if (absHours < 48) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(diffHours, "hour");
  }

  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(diffHours / 24), "day");
}

function getDirectoryName(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? "";
}

function formatPercent(value: number): string {
  return clampPercent(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function formatSkillName(name: string): string {
  const baseName = name.includes(":") ? (name.split(":")[1] ?? name) : name;
  return baseName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatStderr(stderr: string): string {
  const meaningfulLine = stderr
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("WARNING:"));

  return meaningfulLine ? ` ${meaningfulLine}` : "";
}
