import { Tool } from "@raycast/api";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { isDirectory, selectedFinderFiles } from "../lib/files";
import {
  expandHome,
  OUTPUT_FORMATS,
  OutputFormat,
  transcribeFile,
  transcribeFileTo,
  TranscribeOptions,
} from "../lib/mw";
import { MEETING_NOTES_OPTIONS } from "../lib/presets";

const MAX_TRANSCRIPT_CHARS = 200_000;

type Input = {
  /**
   * Absolute path (or path starting with `~`) of the audio or video file to transcribe.
   * Leave empty to transcribe the files currently selected in Finder.
   */
  path?: string;
  /** ISO 639-1 code of the language spoken in the recording (e.g. `en`, `fr`, `de`) or `auto`, never the language to translate into. Leave empty to use the user's default. */
  language?: string;
  /** Output format: one of txt, srt, vtt, json, csv, md, html, avid. Use srt or vtt for subtitles. Defaults to txt. */
  format?: string;
  /** Model id in `engine:model-id` form, exactly as returned by the list-models tool. Leave empty to use the active model. */
  model?: string;
  /** Whether to prefix each segment with a timestamp (text formats only). */
  timestamps?: boolean;
  /** Whether to detect and label the different speakers. */
  speakers?: boolean;
  /**
   * Set to true for meetings, interviews or calls: detects speakers and returns a Markdown transcript grouped by speaker.
   * Overrides format and speakers.
   */
  groupBySpeaker?: boolean;
  /**
   * Absolute path of a file to write the transcript to, only when the user explicitly asks to save it.
   * Only valid when transcribing a single file.
   */
  outputPath?: string;
};

function normalizeFormat(format?: string): OutputFormat {
  const candidate = format?.toLowerCase().replace(/^\./, "");
  return OUTPUT_FORMATS.find((value) => value === candidate) ?? "txt";
}

function toOptions(input: Input): TranscribeOptions {
  const base: TranscribeOptions = {
    format: normalizeFormat(input.format),
    language: input.language,
    model: input.model,
    timestamps: input.timestamps,
    speakers: input.speakers,
  };
  return input.groupBySpeaker ? { ...base, ...MEETING_NOTES_OPTIONS } : base;
}

async function resolveTargets(path?: string): Promise<string[]> {
  if (path?.trim()) return [expandHome(path.trim())];
  return selectedFinderFiles();
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.outputPath) return undefined;
  const target = expandHome(input.outputPath);
  if (!existsSync(target)) return undefined;
  return {
    message: "A file already exists at the output path. Overwrite it with the transcript?",
    info: [
      { name: "Source", value: input.path },
      { name: "Output", value: target },
    ],
  };
};

/**
 * Transcribes an audio or video file with MacWhisper (fully on-device with local models) and returns the transcript.
 */
export default async function tool(input: Input) {
  const targets = await resolveTargets(input.path);
  if (targets.length === 0) {
    return "No file to transcribe: no path was given and nothing is selected in Finder.";
  }
  const folder = targets.find(isDirectory);
  if (folder) {
    return `${folder} is a folder. Ask for a specific audio or video file, or use the Batch Transcribe Folder command.`;
  }

  const options = toOptions(input);
  const format = options.format ?? "txt";

  if (input.outputPath) {
    if (targets.length > 1) return "outputPath can only be used when transcribing a single file.";
    const output = expandHome(input.outputPath);
    await transcribeFileTo(targets[0], output, { ...options, overwrite: true });
    return `Transcript of ${basename(targets[0])} saved to ${output} (${format}).`;
  }

  const transcripts: { file: string; transcript: string }[] = [];
  for (const target of targets) {
    const transcript = await transcribeFile(target, options);
    transcripts.push({
      file: target,
      transcript:
        transcript.length > MAX_TRANSCRIPT_CHARS
          ? `${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}\n[Transcript truncated: ${transcript.length} characters in total]`
          : transcript,
    });
  }
  return { format, transcripts };
}
