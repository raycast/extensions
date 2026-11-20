import { once } from "events";
import { createReadStream, WriteStream } from "fs";
import { access, constants, open, rm } from "fs/promises";
import { homedir } from "os";
import { basename, dirname, extname, join } from "path";
import { createInterface } from "readline";
import { finished } from "stream/promises";
import { PARSED_FILE_MARKER } from "./log-files";

export type MatchMode = "contains" | "regex";

export interface ParseOptions {
  query: string;
  mode: MatchMode;
  caseSensitive: boolean;
  includeLineNumbers: boolean;
}

export interface ParseResult {
  sourceFile: string;
  /** Undefined when nothing matched, since no file is written then. */
  outputFile?: string;
  /** Set when the output had to go somewhere other than where it was asked for. */
  outputFallbackReason?: string;
  matchCount: number;
  linesScanned: number;
  /** The first matching lines, for display. The output file has all of them. */
  preview: string[];
  previewTruncated: boolean;
}

/** Lines shown in the result view. Raycast slows down badly on very large markdown. */
export const PREVIEW_LINE_LIMIT = 500;
const PREVIEW_CHAR_LIMIT = 200_000;

/**
 * Builds the line test for the given options. Throws with a readable message
 * when `mode` is "regex" and the query is not a valid regular expression.
 */
export function buildMatcher(
  options: Pick<ParseOptions, "query" | "mode" | "caseSensitive">,
): (line: string) => boolean {
  if (options.mode === "regex") {
    let regex: RegExp;
    try {
      regex = new RegExp(options.query, options.caseSensitive ? "" : "i");
    } catch (error) {
      // V8's message already reads "Invalid regular expression: /(/i: Unterminated group".
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        message.startsWith("Invalid regular expression") ? message : `Invalid regular expression: ${message}`,
      );
    }
    return (line) => regex.test(line);
  }

  if (options.caseSensitive) {
    return (line) => line.includes(options.query);
  }
  const needle = options.query.toLowerCase();
  return (line) => line.toLowerCase().includes(needle);
}

async function isWritable(folder: string): Promise<boolean> {
  try {
    await access(folder, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Where to write results: the chosen output folder, else the log's own folder.
 * Falls back to ~/Downloads when that folder can't be written to (e.g. /var/log).
 */
async function resolveOutputFolder(sourceFile: string, outputFolder?: string) {
  const preferred = outputFolder || dirname(sourceFile);
  if (await isWritable(preferred)) {
    return { folder: preferred };
  }
  const fallback = join(homedir(), "Downloads");
  return {
    folder: fallback,
    fallbackReason: `Couldn't write to ${preferred}, so the results were saved to ${fallback}`,
  };
}

function outputFileName(sourceFile: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${basename(sourceFile, extname(sourceFile))}${PARSED_FILE_MARKER}${timestamp}.log`;
}

/**
 * Streams `sourceFile` line by line and writes every matching line to a new
 * file, so large logs never have to fit in memory. Nothing is written when
 * there are no matches.
 */
export async function parseLogFile(
  sourceFile: string,
  options: ParseOptions,
  outputFolder?: string,
): Promise<ParseResult> {
  const matches = buildMatcher(options);

  const input = createReadStream(sourceFile, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });

  let output: { file: string; fallbackReason?: string; stream: WriteStream; done: Promise<void> } | undefined;

  const preview: string[] = [];
  let previewChars = 0;
  let previewTruncated = false;
  let matchCount = 0;
  let lineNumber = 0;

  try {
    for await (const line of lines) {
      lineNumber++;
      if (!matches(line)) continue;
      matchCount++;

      const text = options.includeLineNumbers ? `${lineNumber}: ${line}` : line;

      const separator = output ? "\n" : "";
      if (!output) {
        const resolved = await resolveOutputFolder(sourceFile, outputFolder);
        const file = join(resolved.folder, outputFileName(sourceFile));
        const handle = await open(file, "wx");
        const stream = handle.createWriteStream({ encoding: "utf8" });
        const done = finished(stream, { cleanup: true });
        // A write can fail while we're waiting for the next input line.
        void done.catch(() => {});
        output = { file, fallbackReason: resolved.fallbackReason, stream, done };
      }
      if (output.stream.errored) throw output.stream.errored;
      if (!output.stream.write(separator + text)) await once(output.stream, "drain");

      if (!previewTruncated) {
        const separatorLength = preview.length > 0 ? 1 : 0;
        const remainingChars = PREVIEW_CHAR_LIMIT - previewChars - separatorLength;
        if (preview.length < PREVIEW_LINE_LIMIT && remainingChars >= 0) {
          if (text.length <= remainingChars) {
            preview.push(text);
            previewChars += separatorLength + text.length;
          } else {
            const shortened = text.slice(0, remainingChars).replace(/[\uD800-\uDBFF]$/, "");
            if (shortened) preview.push(shortened);
            previewTruncated = true;
          }
        } else {
          previewTruncated = true;
        }
      }
    }
    if (output) {
      output.stream.end();
      await output.done;
    }
  } catch (error) {
    if (output) {
      output.stream.destroy();
      await output.done.catch(() => {});
      await rm(output.file, { force: true }).catch(() => {});
    }
    throw error;
  } finally {
    lines.close();
    input.destroy();
  }

  return {
    sourceFile,
    outputFile: output?.file,
    outputFallbackReason: output?.fallbackReason,
    matchCount,
    linesScanned: lineNumber,
    preview,
    previewTruncated,
  };
}

/**
 * A markdown code fence longer than any run of backticks in `text`, so log
 * lines containing ``` can't end the block early.
 */
export function codeBlock(text: string): string {
  let longestRun = 0;
  for (const [run] of text.matchAll(/`+/g)) longestRun = Math.max(longestRun, run.length);
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}\n${text}\n${fence}`;
}
