import { AI, environment } from "@raycast/api";
import { getTranscript } from "./tuple";

/** Cap the transcript fed to the model so very long calls don't blow the context window. */
const MAX_TRANSCRIPT_CHARS = 50_000;

export interface CallMetadata {
  title: string;
  summary: string;
  /** False when the model didn't return parseable JSON (summary holds the raw reply as a fallback). */
  parsed: boolean;
}

/** Whether the current Raycast install can use the AI API (Raycast Pro). */
export function aiAvailable(): boolean {
  return environment.canAccess(AI);
}

/** Load and trim a transcript for use as model context, noting truncation when it happens. */
export async function transcriptContext(callId: string): Promise<string> {
  const transcript = (await getTranscript(callId)).trim();
  if (transcript.length <= MAX_TRANSCRIPT_CHARS) {
    return transcript;
  }
  return `${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}\n\n[transcript truncated for length]`;
}

export function summaryPrompt(transcript: string): string {
  return [
    "You are summarizing a transcript of a Tuple pair-programming call.",
    "Write a concise summary: what the call was about, key decisions, and any open follow-ups.",
    "Use short markdown sections. If the transcript is empty, say so plainly.",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

function metadataPrompt(transcript: string): string {
  return [
    "You are titling and summarizing a Tuple pair-programming call from its transcript.",
    'Respond with ONLY a JSON object of the form {"title": "...", "summary": "..."} — no markdown, no code fence.',
    "title: at most 8 words. summary: 2-4 sentences covering what the call was about and any decisions.",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

function parseMetadata(raw: string): CallMetadata {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    const obj = JSON.parse(cleaned) as { title?: unknown; summary?: unknown };
    return {
      title: String(obj.title ?? "").slice(0, 1024),
      summary: String(obj.summary ?? "").slice(0, 8192),
      parsed: true,
    };
  } catch {
    // Model didn't return clean JSON — fall back to using the whole reply as the summary. The
    // editable form can still show it; the headless writer rejects it (parsed: false).
    return { title: "", summary: raw.trim().slice(0, 8192), parsed: false };
  }
}

/** Read a call's transcript, ask the model for a title + summary, and return the parsed draft. */
export async function generateCallMetadata(callId: string, signal?: AbortSignal): Promise<CallMetadata> {
  const transcript = await transcriptContext(callId);
  const raw = await AI.ask(metadataPrompt(transcript), { creativity: "low", signal });
  return parseMetadata(raw);
}
