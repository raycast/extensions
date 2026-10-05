import { CaptureRecord } from "./types";

export function formatCapture(records: CaptureRecord[], icons = false): string {
  const names = new Map<number, string>();
  for (const { data } of records) {
    if (data.user) names.set(data.user.id, data.user.full_name || data.user.email || `user:${data.user.id}`);
    for (const participant of data.participants ?? []) {
      names.set(participant.id, participant.full_name || participant.email || `user:${participant.id}`);
    }
  }
  return records
    .map((record) => {
      const instant = record.type === "transcription_finished" ? record.data.start || record.time : record.time;
      const date = new Date(instant);
      const clock = Number.isNaN(date.getTime()) ? instant : date.toLocaleTimeString(undefined, { hour12: false });
      if (record.type === "transcription_finished" && typeof record.data.text === "string") {
        const speaker = names.get(record.data.user_id ?? 0) || `user:${record.data.user_id ?? "unknown"}`;
        return `${icons ? "💬 " : ""}[${clock}] ${speaker}: ${record.data.text}`;
      }
      return `${icons ? `${captureIcon(record)} ` : ""}[${clock}] ${formatCaptureEvent(record, names)}`;
    })
    .join("\n");
}

export function escapeMarkdownText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/([\\`*_[\]{}()#+\-.!|])/g, "\\$1");
}

function captureIcon(record: CaptureRecord): string {
  if (record.category === "content") return "🖥️";
  if (record.category === "events") return "⚡️";
  return "•";
}

function formatCaptureEvent(record: CaptureRecord, names: Map<number, string>): string {
  const actor = captureActor(record, names);
  switch (record.type) {
    case "recording_started":
      return "Capture started";
    case "recording_ended":
      return "Capture ended";
    case "model_initializing":
      return "Transcription model initializing";
    case "model_ready":
      return "Transcription model ready";
    case "user_joined":
      return `${actor} joined`;
    case "user_left":
      return `${actor} left`;
    case "user_screen_sharing_started":
      return `${actor} started sharing their screen`;
    case "user_screen_sharing_stopped":
      return `${actor} stopped sharing their screen`;
    case "shared_content_changed":
      return formatSharedContent(record, actor);
    case "canvas_reset":
      return "Shared canvas reset";
    case "stroke_started":
      return `${actor} started an annotation`;
    case "stroke_ended":
      return `${actor} finished an annotation`;
    case "annotations_cleared":
      return `${actor} cleared annotations`;
    default:
      return humanizeEventType(record.type);
  }
}

function captureActor(record: CaptureRecord, names: Map<number, string>): string {
  const embedded = nestedString(record.data.user, "full_name") || nestedString(record.data.user, "email");
  if (embedded) return embedded;
  if (typeof record.data.user_id === "number") return names.get(record.data.user_id) || `user:${record.data.user_id}`;
  return "Someone";
}

function formatSharedContent(record: CaptureRecord, actor: string): string {
  if (record.data.veiled === true) return `${actor} hid shared content`;
  const app = nestedString(record.data.app, "name");
  const title = nestedString(record.data.title, "value");
  const url = nestedString(record.data.url, "value");
  const subject = [app, title].filter(Boolean).join(": ") || "content";
  return `${actor} shared ${subject}${url ? ` — ${url}` : ""}`;
}

function nestedString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const nested = (value as Record<string, unknown>)[key];
  return typeof nested === "string" && nested.trim() ? nested.trim() : undefined;
}

function humanizeEventType(type: string): string {
  const words = type.replaceAll("_", " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "Capture event";
}
