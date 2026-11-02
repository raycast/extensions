import type { ActionItem, Meeting, MeetingSummary, Segment } from "./recordist";

const SOURCE: Record<string, string> = {
  zoom: "Zoom",
  teams: "Microsoft Teams",
  meet: "Google Meet",
  slack: "Slack",
  webex: "Webex",
  facetime: "FaceTime",
  browser: "Browser",
};

/** The call app a meeting came from, or null for one started by hand or not known. */
export function sourceLabel(source: string | null): string | null {
  if (!source || source === "manual" || source === "unknown") return null;
  return SOURCE[source] ?? source.charAt(0).toUpperCase() + source.slice(1);
}

const STATUS: Record<string, string> = {
  recording: "Recording",
  transcribing: "Transcribing",
  summarising: "Writing the notes",
  failed: "No transcript",
};

/** A word for a meeting that is not ready yet, or null once it is. */
export function statusLabel(status: string): string | null {
  return status === "ready" ? null : (STATUS[status] ?? status);
}

export const title = (m: Pick<MeetingSummary, "title">): string => m.title?.trim() || "Untitled meeting";

export function longDate(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function shortDate(ms: number): string {
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

export function duration(ms: number | null): string | null {
  if (!ms || ms < 1000) return null;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return `${Math.round(ms / 1000)} s`;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** m:ss or h:mm:ss, as Recordist shows a line's time. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

const noteOf = (m: Meeting, kind: string): string | null => {
  const text = m.notes.find((n) => n.kind === kind)?.content_md?.trim();
  return text ? text : null;
};

export function actionItemLine(item: ActionItem): string {
  const who = [item.owner?.trim(), item.due ? `due ${item.due}` : null].filter(Boolean).join(", ");
  const text = item.done ? `~~${item.text}~~` : item.text;
  return `- ${text}${who ? ` (${who})` : ""}`;
}

/** What a meeting's detail pane shows: its summary, decisions and action items. */
export function meetingMarkdown(m: Meeting): string {
  const out = [`# ${title(m)}`];
  const status = statusLabel(m.status);
  if (status && m.status !== "failed") out.push(`_${status}. The notes appear here when Recordist has written them._`);
  if (m.status === "failed") out.push("_This recording produced no transcript._");
  const summary = noteOf(m, "summary");
  if (summary) out.push("## Summary", summary);
  const decisions = noteOf(m, "decisions");
  out.push("## Decisions", decisions ?? "_No decisions in the notes._");
  out.push(
    "## Action Items",
    m.action_items.length ? m.action_items.map(actionItemLine).join("\n") : "_No action items in the notes._",
  );
  return out.join("\n\n");
}

/** The notes as Markdown, to copy: summary, decisions, action items and open questions. */
export function notesMarkdown(m: Meeting): string {
  const out = [`# ${title(m)}`, longDate(m.started_at)];
  const summary = noteOf(m, "summary");
  if (summary) out.push("## Summary", summary);
  const decisions = noteOf(m, "decisions");
  if (decisions) out.push("## Decisions", decisions);
  if (m.action_items.length) out.push("## Action Items", m.action_items.map(actionItemLine).join("\n"));
  const questions = noteOf(m, "questions");
  if (questions) out.push("## Open Questions", questions);
  return out.join("\n\n");
}

export function actionItemsText(m: Meeting): string {
  return m.action_items.map(actionItemLine).join("\n");
}

/** The transcript as Markdown: who spoke, when, and what was said. */
export function transcriptMarkdown(meetingTitle: string, segments: Segment[]): string {
  if (segments.length === 0) return `# ${meetingTitle}\n\n_No transcript yet._`;
  const lines = segments.map(
    (s) =>
      `**${s.speaker?.trim() || (s.channel === "mic" ? "You" : "Speaker")}** · ${clock(s.start_ms)}  \n${s.text.trim()}`,
  );
  return [`# ${meetingTitle}`, ...lines].join("\n\n");
}
