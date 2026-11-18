import { FormattedTranscription, OutputFormat, TranscriptionResult, TranscriptionSegment } from "../types";

export function formatTimestamp(seconds?: number): string {
  if (seconds === undefined || isNaN(seconds)) {
    return "00:00:00";
  }

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatSrtTimestamp(seconds?: number): string {
  const totalMilliseconds = Math.max(0, Math.round((seconds !== undefined && !isNaN(seconds) ? seconds : 0) * 1000));
  const hrs = Math.floor(totalMilliseconds / 3_600_000);
  const mins = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((totalMilliseconds % 60_000) / 1000);
  const ms = totalMilliseconds % 1000;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function formatTranscription(
  result: TranscriptionResult,
  includeTimestamps: boolean,
  includeSpeakerLabels: boolean,
): FormattedTranscription {
  if (result.segments && result.segments.length > 0) {
    return formatSegmented(result, includeTimestamps, includeSpeakerLabels);
  }

  return formatPlainText(result.text);
}

function formatPlainText(text: string): FormattedTranscription {
  const paragraphs = splitIntoParagraphs(text.trim());
  const plainText = paragraphs.join("\n\n");

  const markdown = paragraphs
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => escapeMarkdown(line))
        .join(" "),
    )
    .join("\n\n");

  return { plainText, markdown };
}

function splitIntoParagraphs(text: string): string[] {
  if (!text) return [];

  // If the transcript already has paragraph breaks, preserve them.
  const explicitParagraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (explicitParagraphs.length > 1) {
    return explicitParagraphs;
  }

  // Otherwise, break long monolithic text into sentence-based paragraphs.
  return breakSentencesIntoParagraphs(explicitParagraphs[0] || text);
}

function breakSentencesIntoParagraphs(text: string): string[] {
  const sentenceEnd = /([.!?])(\s+|$)/g;
  const sentences: string[] = [];
  let match;
  let lastIndex = 0;

  while ((match = sentenceEnd.exec(text)) !== null) {
    const end = match.index + match[1].length;
    const sentence = text.slice(lastIndex, end).trim();
    if (sentence) sentences.push(sentence);
    lastIndex = end;
  }

  const tail = text.slice(lastIndex).trim();
  if (tail) sentences.push(tail);

  // Group sentences into paragraphs of 2–4 sentences for readability.
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(" "));
  }

  return paragraphs.length > 0 ? paragraphs : [text];
}

function formatSegmented(
  result: TranscriptionResult,
  includeTimestamps: boolean,
  includeSpeakerLabels: boolean,
): FormattedTranscription {
  const paragraphs = groupSegmentsIntoParagraphs(result.segments || [], includeTimestamps, includeSpeakerLabels);

  const plainText = paragraphs.map((paragraph) => paragraph.lines.join("\n")).join("\n\n");

  const markdown = paragraphs.map((paragraph) => paragraph.markdownLines.join("\n")).join("\n\n");

  return {
    plainText,
    markdown,
    srt: buildSrt(result.segments || [], includeSpeakerLabels),
  };
}

interface Paragraph {
  lines: string[];
  markdownLines: string[];
}

function groupSegmentsIntoParagraphs(
  segments: TranscriptionSegment[],
  includeTimestamps: boolean,
  includeSpeakerLabels: boolean,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let current: Paragraph | null = null;

  for (const segment of segments) {
    const parts: string[] = [];
    const markdownParts: string[] = [];

    if (includeTimestamps && (segment.start !== undefined || segment.end !== undefined)) {
      const start = segment.start ?? 0;
      const end = segment.end ?? start;
      const timestamp = `[${formatTimestamp(start)} → ${formatTimestamp(end)}]`;
      parts.push(timestamp);
      markdownParts.push(timestamp);
    }

    if (includeSpeakerLabels && segment.speaker) {
      parts.push(`${segment.speaker}:`);
      markdownParts.push(`**${escapeMarkdown(segment.speaker)}:**`);
    }

    parts.push(segment.text.trim());
    markdownParts.push(escapeMarkdown(segment.text.trim()));

    const line = parts.filter(Boolean).join(" ");
    const markdownLine = markdownParts.filter(Boolean).join(" ");

    // Start a new paragraph whenever the speaker changes.
    if (
      current &&
      includeSpeakerLabels &&
      segment.speaker &&
      current.markdownLines[0]?.includes(`**${segment.speaker}:**`)
    ) {
      current.lines.push(line);
      current.markdownLines.push(markdownLine);
    } else {
      current = { lines: [line], markdownLines: [markdownLine] };
      paragraphs.push(current);
    }
  }

  return paragraphs;
}

function buildSrt(segments: TranscriptionSegment[], includeSpeakerLabels: boolean): string {
  return segments
    .filter((segment) => segment.start !== undefined && segment.end !== undefined)
    .map((segment, index) => {
      const start = formatSrtTimestamp(segment.start);
      const end = formatSrtTimestamp(segment.end);
      const speaker = includeSpeakerLabels && segment.speaker ? `[${segment.speaker}] ` : "";
      return `${index + 1}\n${start} --> ${end}\n${speaker}${segment.text.trim()}\n`;
    })
    .join("\n");
}

export function hasTimedSegments(result: TranscriptionResult): boolean {
  return Boolean(result.segments?.some((segment) => segment.start !== undefined && segment.end !== undefined));
}

export function formatForOutput(
  result: TranscriptionResult,
  outputFormat: OutputFormat,
  includeSpeakerLabels: boolean,
): string {
  const formatted = formatTranscription(result, false, includeSpeakerLabels);
  switch (outputFormat) {
    case "plain":
      return formatted.plainText;
    case "srt":
      if (!hasTimedSegments(result)) {
        throw new Error("SRT is unavailable because this transcription has no timestamps.");
      }
      return formatted.srt || "";
    case "markdown":
    default:
      return formatted.markdown;
  }
}

export function outputExtension(outputFormat: OutputFormat): string {
  switch (outputFormat) {
    case "plain":
      return ".txt";
    case "srt":
      return ".srt";
    case "markdown":
    default:
      return ".md";
  }
}

export function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/`/g, "\\`");
}
