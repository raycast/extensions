import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export type Speaker = "you" | "them";

export interface SessionRecord {
  speaker: Speaker;
  text: string;
  timestamp: string | Date;
  suggestions?: string[];
  kbHits?: string[];
  suggestionDecision?: unknown;
  surfacedSuggestionText?: string | null;
  conversationStateSummary?: string | null;
  refinedText?: string | null;
}

export interface TemplateSnapshot {
  id: string;
  name: string;
  icon: string;
  systemPrompt: string;
}

export interface EnhancedNotes {
  template: TemplateSnapshot;
  generatedAt: string;
  markdown: string;
}

export interface SessionIndex {
  id: string;
  startedAt: string;
  endedAt?: string;
  templateSnapshot?: TemplateSnapshot;
  title?: string;
  utteranceCount: number;
  hasNotes: boolean;
}

interface SessionSidecar {
  index: SessionIndex;
  notes?: EnhancedNotes | null;
}

export interface SessionSummary {
  id: string;
  title: string;
  startedAt: Date;
  endedAt?: Date;
  utteranceCount: number;
  hasNotes: boolean;
  notesPreview?: string;
  transcriptPreview?: string;
  searchText: string;
}

export interface SessionDetails {
  notes?: EnhancedNotes;
  transcript: SessionRecord[];
}

const sessionDirectory = path.join(os.homedir(), "Library", "Application Support", "OpenOats", "sessions");
const exportDirectory = path.join(os.homedir(), "Downloads", "OpenOats Exports");

export function getSessionDirectory() {
  return sessionDirectory;
}

export async function listSessions(): Promise<SessionSummary[]> {
  const entries = await safeReadDir(sessionDirectory);
  const metaFiles = entries.filter((entry) => entry.endsWith(".meta.json"));
  const jsonlFiles = entries.filter((entry) => entry.endsWith(".jsonl"));
  const sessions = new Map<string, SessionSummary>();

  for (const filename of metaFiles) {
    const filePath = path.join(sessionDirectory, filename);
    const raw = await fs.readFile(filePath, "utf8");
    const sidecar = JSON.parse(raw) as SessionSidecar;
    const transcriptPreview = await loadTranscriptPreview(sidecar.index.id);
    const summary = toSummary(sidecar.index, sidecar.notes ?? undefined, transcriptPreview);
    sessions.set(summary.id, summary);
  }

  for (const filename of jsonlFiles) {
    const sessionID = filename.replace(/\.jsonl$/, "");
    if (sessions.has(sessionID)) {
      continue;
    }

    const transcript = await loadTranscript(sessionID);
    sessions.set(
      sessionID,
      {
        id: sessionID,
        title: "Untitled session",
        startedAt: parseSessionDate(sessionID) ?? new Date(0),
        endedAt: undefined,
        utteranceCount: transcript.length,
        hasNotes: false,
        notesPreview: undefined,
        transcriptPreview: summarizeTranscript(transcript),
        searchText: summarizeTranscript(transcript),
      },
    );
  }

  return Array.from(sessions.values()).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

export async function loadSessionDetails(sessionID: string): Promise<SessionDetails> {
  const [notes, transcript] = await Promise.all([loadNotes(sessionID), loadTranscript(sessionID)]);
  return { notes, transcript };
}

export async function loadTranscript(sessionID: string): Promise<SessionRecord[]> {
  const transcriptPath = path.join(sessionDirectory, `${sessionID}.jsonl`);
  const raw = await safeReadFile(transcriptPath);
  if (!raw) {
    return [];
  }

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as SessionRecord];
      } catch {
        return [];
      }
    });
}

export async function loadNotes(sessionID: string): Promise<EnhancedNotes | undefined> {
  const sidecarPath = path.join(sessionDirectory, `${sessionID}.meta.json`);
  const raw = await safeReadFile(sidecarPath);
  if (!raw) {
    return undefined;
  }

  const sidecar = JSON.parse(raw) as SessionSidecar;
  return sidecar.notes ?? undefined;
}

export function formatTranscript(records: SessionRecord[]) {
  return records
    .map((record) => `[${formatTime(record.timestamp)}] ${record.speaker === "you" ? "You" : "Them"}: ${recordDisplayText(record)}`)
    .join("\n");
}

export function buildSessionMarkdown(session: SessionSummary, details?: SessionDetails) {
  const lines = [
    `# ${escapeMarkdown(session.title)}`,
    "",
    `- Started: ${formatDateTime(session.startedAt)}`,
    `- Utterances: ${session.utteranceCount}`,
    `- Notes: ${session.hasNotes ? "Yes" : "No"}`,
    "",
  ];

  if (details?.notes?.markdown) {
    lines.push("## Notes", "", details.notes.markdown, "");
  } else {
    lines.push("## Notes", "", "_No generated notes for this session yet._", "");
  }

  if (details?.transcript?.length) {
    lines.push("## Transcript", "", "```text", formatTranscript(details.transcript), "```");
  } else {
    lines.push("## Transcript", "", "_No transcript data found for this session._");
  }

  return lines.join("\n");
}

export function makeCreateNoteUrl() {
  return "openoats://start";
}

export function makeStopRecordingUrl() {
  return "openoats://stop";
}

export function makeSessionUrl(sessionID?: string) {
  if (!sessionID) {
    return "openoats://notes";
  }

  return `openoats://notes?sessionID=${encodeURIComponent(sessionID)}`;
}

export async function exportTranscript(session: SessionSummary) {
  const transcript = await loadTranscript(session.id);
  if (!transcript.length) {
    throw new Error("No transcript found for this session.");
  }

  const destination = path.join(exportDirectory, "Transcripts", `${safeFileName(session.title)}-${session.id}.txt`);
  await writeExport(destination, formatTranscript(transcript));
  return destination;
}

export async function exportNotes(session: SessionSummary) {
  const notes = await loadNotes(session.id);
  if (!notes?.markdown) {
    throw new Error("No generated notes found for this session.");
  }

  const destination = path.join(exportDirectory, "Notes", `${safeFileName(session.title)}-${session.id}.md`);
  await writeExport(destination, notes.markdown);
  return destination;
}

function toSummary(index: SessionIndex, notes?: EnhancedNotes, transcriptPreview?: string): SessionSummary {
  const title = index.title?.trim() || "Untitled session";
  const startedAt = new Date(index.startedAt);
  const notesPreview = notes?.markdown
    ?.replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  return {
    id: index.id,
    title,
    startedAt,
    endedAt: index.endedAt ? new Date(index.endedAt) : undefined,
    utteranceCount: index.utteranceCount,
    hasNotes: index.hasNotes,
    notesPreview,
    transcriptPreview,
    searchText: [title, notesPreview, transcriptPreview].filter(Boolean).join(" "),
  };
}

function parseSessionDate(sessionID: string) {
  const match = sessionID.match(/^session_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const [, year, month, day, hour, minute, second] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

async function safeReadDir(directory: string) {
  try {
    return await fs.readdir(directory);
  } catch {
    return [];
  }
}

async function safeReadFile(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

async function writeExport(destination: string, content: string) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, content, "utf8");
}

function safeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "openoats-session";
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatTime(value: string | Date) {
  const date = new Date(value instanceof Date ? value.toISOString() : value);
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function escapeMarkdown(value: string) {
  return value.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
}

async function loadTranscriptPreview(sessionID: string) {
  const transcript = await loadTranscript(sessionID);
  return summarizeTranscript(transcript);
}

function summarizeTranscript(records: SessionRecord[]) {
  return records
    .slice(0, 40)
    .map((record) => recordDisplayText(record))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);
}

function recordDisplayText(record: SessionRecord) {
  return record.refinedText?.trim() || record.text;
}
