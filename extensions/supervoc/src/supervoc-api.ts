import { supervocPreferences } from "./preferences";

export type EntryKind = "word" | "phrase" | "pattern";

export interface UsageExample {
  target: string;
  native: string;
}

export interface AssociationHint {
  language: "fr";
  word: string;
  sharedRoot: string | null;
}

export interface Candidate {
  kind: EntryKind;
  lemma: string;
  sense: string;
  translation: string;
  explanation: string;
  usageExamples: UsageExample[];
  associationHint: AssociationHint;
}

export interface Analysis {
  context: string;
  candidates: Candidate[];
}

export interface Entry {
  id: string;
  lemma: string;
  dueAt: string;
  contexts: { text: string; capturedAt: string }[];
}

export interface SavedEntry {
  entry: Entry;
  created: boolean;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export const ANALYSIS_TEXT_MAX_LENGTH = 300;
export const CONTEXT_MAX_LENGTH = 2000;

async function callSupervoc<Reply>(
  path: string,
  body: unknown,
): Promise<Reply> {
  const { supervocServerURL, supervocAccessToken } = supervocPreferences();
  if (!supervocServerURL) {
    throw new Error("Set the Supervoc Server URL in extension preferences");
  }
  if (!supervocAccessToken) {
    throw new Error(
      "Set the Supervoc Access Token from /token in extension preferences",
    );
  }
  let reply: Response;
  try {
    reply = await fetch(`${supervocServerURL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supervocAccessToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch (failure) {
    const message =
      failure instanceof Error ? failure.message : String(failure);
    throw new Error(`Supervoc ${path}: ${message}`);
  }
  if (!reply.ok) {
    const errorBody = (await reply.json().catch(() => ({}))) as ApiErrorBody;
    const detail = errorBody.error?.message ?? reply.statusText;
    throw new Error(`Supervoc ${path}: ${reply.status} ${detail}`);
  }
  return (await reply.json()) as Reply;
}

export async function quickTranslation(text: string): Promise<string> {
  const reply = await callSupervoc<{ translation: string }>(
    "/v1/quick-translations",
    { text },
  );
  return reply.translation;
}

export function analyse(text: string, context: string): Promise<Analysis> {
  return callSupervoc<Analysis>("/v1/analyses", { text, context });
}

export function saveEntry(
  candidate: Candidate,
  context: string,
): Promise<SavedEntry> {
  return callSupervoc<SavedEntry>("/v1/entries", { candidate, context });
}

export type SaveOutcome =
  | { status: "saved"; saved: SavedEntry }
  | { status: "failed"; message: string };

export interface CapturedCandidate {
  candidate: Candidate;
  outcome: SaveOutcome;
}

export interface CaptureResult {
  context: string;
  candidates: CapturedCandidate[];
}

export async function saveCandidate(
  candidate: Candidate,
  context: string,
): Promise<SaveOutcome> {
  try {
    return { status: "saved", saved: await saveEntry(candidate, context) };
  } catch (failure) {
    const message =
      failure instanceof Error ? failure.message : String(failure);
    return { status: "failed", message };
  }
}

export async function capture(
  text: string,
  context: string,
): Promise<CaptureResult> {
  const analysis = await analyse(text, context);
  const candidates = await Promise.all(
    analysis.candidates.map(async (candidate) => ({
      candidate,
      outcome: await saveCandidate(candidate, analysis.context),
    })),
  );
  return { context: analysis.context, candidates };
}
