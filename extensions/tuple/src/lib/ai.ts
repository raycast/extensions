import { AI, environment } from "@raycast/api";
import { getTranscript } from "./tuple";

/** Cap the transcript fed to the model so very long calls don't blow the context window. */
const MAX_TRANSCRIPT_CHARS = 50_000;

/** A title + summary pair — the editable draft that gets applied to a call. */
export interface CallDraft {
  title: string;
  summary: string;
}

export interface CallMetadata extends CallDraft {
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

function metadataPrompt(transcript: string): string {
  return [
    "You are titling and summarizing a Tuple pair-programming call from its transcript.",
    'Respond with ONLY a JSON object of the form {"title": "...", "summary": "..."} — no markdown, no code fence.',
    "title: at most 8 words. summary: 2-4 sentences covering what the call was about and any decisions.",
    'If the transcript is empty or has no real content, return {"title": "", "summary": ""} rather than inventing one.',
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
    const parsed = JSON.parse(cleaned);
    // JSON.parse happily accepts bare strings/numbers/arrays; only an object carries title/summary.
    // Anything else means the model didn't follow the shape — preserve its raw words via the fallback.
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not a JSON object");
    }
    const obj = parsed as { title?: unknown; summary?: unknown };
    return {
      title: String(obj.title ?? "").slice(0, 1024),
      summary: String(obj.summary ?? "").slice(0, 8192),
      parsed: true,
    };
  } catch {
    // Model didn't return a clean JSON object — fall back to using the whole reply as the summary. The
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
