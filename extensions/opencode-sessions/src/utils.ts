import { SessionWithProject, TranscriptEntry } from "./types";

export function groupSessionsByTime(sessions: SessionWithProject[]): [string, SessionWithProject[]][] {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfDay - 86400000;
  const daysSinceMonday = (now.getDay() + 6) % 7; // Monday=0 … Sunday=6
  const startOfWeek = startOfDay - daysSinceMonday * 86400000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const groups = new Map<string, SessionWithProject[]>();
  const order: string[] = [];

  for (const item of sessions) {
    const t = item.session.time.updated;

    let label: string;

    if (t >= startOfDay) {
      label = "Today";
    } else if (t >= startOfYesterday) {
      label = "Yesterday";
    } else if (t >= startOfWeek) {
      label = "This Week";
    } else if (t >= startOfMonth) {
      label = "This Month";
    } else {
      label = "Older";
    }

    if (!groups.has(label)) {
      groups.set(label, []);
      order.push(label);
    }

    groups.get(label)!.push(item);
  }

  return order.map((label) => [label, groups.get(label)!]);
}

export function formatAccessoryDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfDay - 86400000;
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const startOfWeek = startOfDay - daysSinceMonday * 86400000;

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (timestamp >= startOfDay) {
    return time;
  }

  if (timestamp >= startOfYesterday) {
    return time;
  }

  if (timestamp >= startOfWeek) {
    const day = date.toLocaleDateString(undefined, { weekday: "short" });

    return `${day} ${time}`;
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function shellEscape(s: string): string {
  // Wrap in single quotes, escaping any embedded single quotes
  return `'${s.replace(/'/g, "'\\''")}'`;
}

export function repoName(worktree: string): string {
  if (worktree === "/") {
    return "No Project";
  }

  const parts = worktree.split("/");

  return parts[parts.length - 1] || worktree;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCost(cost: number): string {
  if (cost === 0) {
    return "$0.00";
  }

  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }

  return `$${cost.toFixed(2)}`;
}

export function formatTokens(count: number): string {
  if (count < 1000) {
    return String(count);
  }

  if (count < 1_000_000) {
    return `${(count / 1000).toFixed(1)}k`;
  }

  return `${(count / 1_000_000).toFixed(1)}M`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildTranscriptMarkdown(entries: TranscriptEntry[]): string {
  const sections: string[] = [];

  for (const { message, parts } of entries) {
    const textParts = parts.filter((p) => p.type === "text" && p.text);
    const toolParts = parts.filter((p) => p.type === "tool");

    const timestamp = formatTime(message.time.created);
    const roleLabel = message.role === "user" ? "User" : "Assistant";

    if (textParts.length > 0) {
      const text = textParts.map((p) => p.text).join("\n\n");
      const maxTicks = (text.match(/`+/g) || []).reduce((max, run) => Math.max(max, run.length), 0);
      const fence = "`".repeat(Math.max(3, maxTicks + 1));

      sections.push(`***${roleLabel}** ${timestamp}*\n\n${fence}\n${text}\n${fence}\n&nbsp;`);
    } else if (toolParts.length > 0) {
      // Tool-only message: show a brief summary
      const tools = [...new Set(toolParts.map((p) => p.tool ?? "unknown"))];

      sections.push(`***${roleLabel}** ${timestamp}*\n\n*Used ${tools.join(", ")}*\n\n&nbsp;`);
    }
  }

  return sections.join("\n\n");
}
