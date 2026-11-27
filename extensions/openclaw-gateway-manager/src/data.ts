export interface Session {
  key: string;
  ageMs: number | null;
  totalTokens: number | null;
  contextTokens: number | null;
  model: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export function parseSessions(raw: string): Session[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("OpenClaw returned invalid session JSON.");
  }
  if (!record(data) || !Array.isArray(data.sessions))
    throw new Error("OpenClaw returned an unsupported session response.");
  return data.sessions.map((value) => {
    if (!record(value) || typeof value.key !== "string")
      throw new Error("OpenClaw returned an invalid session entry.");
    return {
      key: value.key,
      ageMs: number(value.ageMs),
      totalTokens: number(value.totalTokens),
      contextTokens: number(value.contextTokens),
      model: typeof value.model === "string" ? value.model : "Unknown model",
    };
  });
}

export interface HealthChannel {
  id: string;
  name: string;
  configured: boolean | null;
  running: boolean | null;
  connected: boolean | null;
  probe: boolean | null;
  summary: string;
  state: "ok" | "warning" | "neutral";
}

export interface HealthOverview {
  ok: boolean;
  durationMs: number | null;
  sessionCount: number | null;
  channels: HealthChannel[];
  issues: string[];
}

function flag(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function parseHealth(raw: string): HealthOverview {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("OpenClaw returned invalid health JSON.");
  }
  if (!record(data) || typeof data.ok !== "boolean")
    throw new Error("OpenClaw returned an unsupported health response.");
  const issues: string[] = data.ok ? [] : ["Gateway health check failed"];
  const channels: HealthChannel[] = [];
  const names: Record<string, string> = {
    feishu: "Feishu",
    telegram: "Telegram",
    discord: "Discord",
    slack: "Slack",
    whatsapp: "WhatsApp",
  };
  if (record(data.channels)) {
    for (const [id, value] of Object.entries(data.channels)) {
      const channel = record(value) ? value : {};
      const name = names[id] ?? id.replace(/[\r\n\t]/g, " ");
      const configured = flag(channel.configured);
      const running = flag(channel.running);
      const connected = flag(channel.connected);
      const probe = record(channel.probe) ? flag(channel.probe.ok) : null;
      let summary = "Not reported";
      let state: HealthChannel["state"] = "neutral";
      if (configured === false) summary = "Not configured";
      else if (probe === false) {
        summary = "Probe failed";
        state = "warning";
        issues.push(`${name}: Probe failed`);
      } else if (probe === true) {
        summary = "Probe passed";
        state = "ok";
      } else if (running === false || connected === false) {
        summary = "Needs attention";
        state = "warning";
        const reasons = [
          running === false ? "Reported not running" : "",
          connected === false ? "Reported disconnected" : "",
        ].filter(Boolean);
        issues.push(
          `${name}: ${reasons.join(", ")}; probe result not reported`,
        );
      } else if (connected === true) {
        summary = "Connected";
        state = "ok";
      } else if (running === true) {
        summary = "Running";
        state = "ok";
      } else if (configured === true) summary = "Configured";
      channels.push({
        id,
        name,
        configured,
        running,
        connected,
        probe,
        summary,
        state,
      });
    }
  }
  return {
    ok: data.ok,
    durationMs: number(data.durationMs),
    sessionCount: record(data.sessions) ? number(data.sessions.count) : null,
    channels,
    issues,
  };
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!>|~-]/g, "\\$&");
}

export function formatHealth(health: HealthOverview): string {
  const duration =
    health.durationMs === null ? "Not reported" : `${health.durationMs} ms`;
  let markdown = `# ${health.ok ? "🟢 Gateway healthy" : "🔴 Gateway unhealthy"}\n\nCheck duration **${duration}**\n\n---\n\n`;
  if (health.issues.length)
    markdown += `## ⚠️ Needs attention · ${health.issues.length} issues\n\n${health.issues.map((issue) => "- " + escapeMarkdown(issue)).join("\n")}\n\n`;
  else markdown += "No explicit issues were reported.\n\n";
  markdown += "## Channels\n\n";
  for (const channel of health.channels) {
    const state = (value: boolean | null, yes: string, no: string) =>
      value === null ? "Not reported" : value ? yes : no;
    markdown += `### ${escapeMarkdown(channel.name)} · ${channel.summary}\n\n| Property | Result |\n| --- | --- |\n`;
    markdown += `| Configured | ${state(channel.configured, "Configured", "Not configured")} |\n`;
    markdown += `| Running | ${state(channel.running, "Running", "Not running")} |\n`;
    markdown += `| Connected | ${state(channel.connected, "Connected", "Disconnected")} |\n`;
    markdown += `| Probe | ${state(channel.probe, "Passed", "Failed")} |\n\n`;
  }
  if (!health.channels.length) markdown += "No channel status reported.\n\n";
  markdown += `## Sessions\n\n${health.sessionCount === null ? "Session count not reported." : `Current sessions: **${health.sessionCount}**`}\n\n`;
  if (
    health.channels.some((channel) =>
      [
        channel.configured,
        channel.running,
        channel.connected,
        channel.probe,
      ].includes(null),
    )
  )
    markdown +=
      "“Not reported” means the response omitted that field; it does not imply failure.";
  return markdown;
}

export function healthMarkdown(raw: string): string {
  return formatHealth(parseHealth(raw));
}
