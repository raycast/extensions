import { classifyError, jsonArgs, parseJson, runTuple, stripAnsi } from "./tuple";
import { TupleError, TupleErrorKind, VoiceNote, VoiceNoteTranscript } from "./types";

export type VoiceNoteFilter = "received" | "sent" | "unheard" | "all";

export async function voiceNotesAvailable(): Promise<boolean> {
  try {
    const help = stripAnsi(await runTuple(["--help"], 3_000));
    return /^\s+voice-notes\s+/m.test(help);
  } catch {
    return false;
  }
}

async function runVoiceNotes<T>(args: string[], timeout = 15_000): Promise<T | undefined> {
  if (!(await voiceNotesAvailable())) return undefined;
  try {
    return parseJson<T>(await runTuple(jsonArgs("voice-notes", ...args), timeout));
  } catch (error) {
    if (classifyError(error).kind === TupleErrorKind.CapabilityUnavailable || !(await voiceNotesAvailable())) {
      return undefined;
    }
    throw error;
  }
}

export async function listVoiceNotes(filter: VoiceNoteFilter = "received"): Promise<VoiceNote[] | null> {
  const args = ["list"];
  if (filter === "received" || filter === "sent") args.push(`--${filter}`);
  if (filter === "unheard") args.push("--received", "--unheard");
  const notes = await runVoiceNotes<VoiceNote[] | null>(args);
  return notes === undefined ? null : (notes ?? []);
}

export async function getVoiceNoteTranscript(id: string): Promise<VoiceNoteTranscript | null> {
  const transcript = await runVoiceNotes<VoiceNoteTranscript>(["transcript", id, "--timeout", "2m"], 125_000);
  if (transcript === undefined) return null;
  if (!transcript || transcript.state !== "done" || typeof transcript.text !== "string") {
    throw new TupleError(TupleErrorKind.Unknown, "Tuple returned an incomplete voice note transcript.");
  }
  return transcript;
}
