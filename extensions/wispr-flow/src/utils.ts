import { Transcript, GroupedTranscripts } from "./types";

const APP_NAMES: Record<string, string> = {
  "com.tinyspeck.slackmacgap": "Slack",
  "md.obsidian": "Obsidian",
  "com.apple.MobileSMS": "Messages",
  "com.apple.mail": "Mail",
  "com.microsoft.VSCode": "VS Code",
  "com.google.Chrome": "Chrome",
  "com.apple.Safari": "Safari",
  "org.mozilla.firefox": "Firefox",
  "com.electron.wispr-flow": "Wispr Flow",
  "com.openai.chat": "ChatGPT",
  "com.microsoft.teams2": "Teams",
  "com.microsoft.Outlook": "Outlook",
  "com.microsoft.Word": "Word",
  "com.microsoft.Excel": "Excel",
  "com.apple.Notes": "Notes",
  "com.apple.reminders": "Reminders",
  "com.linear": "Linear",
  "com.figma.Desktop": "Figma",
  "com.spotify.client": "Spotify",
  "com.apple.dt.Xcode": "Xcode",
  "com.googlecode.iterm2": "iTerm2",
  "com.mitchellh.ghostty": "Ghostty",
  "net.kovidgoyal.kitty": "Kitty",
  "com.github.wez.wezterm": "WezTerm",
  "dev.warp.Warp-Stable": "Warp",
  "com.hnc.Discord": "Discord",
  "com.electron.notion": "Notion",
  "us.zoom.xos": "Zoom",
  "com.brave.Browser": "Brave",
  "com.arc.Arc": "Arc",
  "company.thebrowser.Browser": "Arc",
  "com.cursor.Cursor": "Cursor",
};

export function getAppName(bundleId: string | null): string {
  if (!bundleId) return "Unknown";
  return APP_NAMES[bundleId] ?? bundleId.split(".").pop() ?? bundleId;
}

export function getDisplayText(transcript: Transcript): string {
  return (
    transcript.editedText ||
    transcript.formattedText ||
    transcript.asrText ||
    ""
  );
}

export function parseTimestamp(timestamp: string | null): Date {
  if (!timestamp) return new Date(0);
  return new Date(timestamp);
}

export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function groupTranscriptsByDate(
  transcripts: Transcript[],
): GroupedTranscripts[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const thisWeekStart = new Date(todayStart);
  thisWeekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000);

  const groups: Record<string, Transcript[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    "Last Week": [],
    Older: [],
  };

  for (const t of transcripts) {
    const date = parseTimestamp(t.timestamp);
    if (date >= todayStart) {
      groups["Today"].push(t);
    } else if (date >= yesterdayStart) {
      groups["Yesterday"].push(t);
    } else if (date >= thisWeekStart) {
      groups["This Week"].push(t);
    } else if (date >= lastWeekStart) {
      groups["Last Week"].push(t);
    } else {
      groups["Older"].push(t);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([title, transcripts]) => ({ title, transcripts }));
}

export function getUniqueApps(
  transcripts: Transcript[],
): { bundleId: string; name: string }[] {
  const appSet = new Map<string, string>();
  for (const t of transcripts) {
    if (t.app && !appSet.has(t.app)) {
      appSet.set(t.app, getAppName(t.app));
    }
  }
  return Array.from(appSet.entries())
    .map(([bundleId, name]) => ({ bundleId, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
