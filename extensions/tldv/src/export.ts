import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import {
  Meeting,
  TranscriptResponse,
  HighlightsResponse,
  ExportFormat,
} from "./types";
import { formatDate, formatDuration, formatTime } from "./utils";

// Export meeting data to various formats
export function exportMeeting(
  meeting: Meeting,
  transcript: TranscriptResponse | null,
  highlights: HighlightsResponse | null,
  format: ExportFormat,
): string {
  switch (format) {
    case "markdown":
      return exportToMarkdown(meeting, transcript, highlights);
    case "txt":
      return exportToText(meeting, transcript, highlights);
    case "json":
      return exportToJson(meeting, transcript, highlights);
    default:
      return exportToMarkdown(meeting, transcript, highlights);
  }
}

function exportToMarkdown(
  meeting: Meeting,
  transcript: TranscriptResponse | null,
  highlights: HighlightsResponse | null,
): string {
  let md = `# ${meeting.name}\n\n`;
  md += `**Date:** ${formatDate(meeting.happenedAt, "absolute")}\n`;
  md += `**Duration:** ${formatDuration(meeting.duration)}\n`;
  md += `**Organizer:** ${meeting.organizer?.name || "Unknown"}\n`;

  if (meeting.invitees?.length > 0) {
    md += `**Participants:** ${meeting.invitees.map((i) => i.name || i.email).join(", ")}\n`;
  }

  md += `**URL:** ${meeting.url}\n\n`;

  // AI Summary from highlights
  if (highlights?.data?.length) {
    const topics = new Map<string, string>();
    highlights.data.forEach((h) => {
      if (h.topic?.title && h.topic?.summary && !topics.has(h.topic.title)) {
        topics.set(h.topic.title, h.topic.summary);
      }
    });

    if (topics.size > 0) {
      md += `## AI Summary\n\n`;
      topics.forEach((summary, title) => {
        md += `### ${title}\n\n${summary}\n\n`;
      });
    }
  }

  // Highlights
  if (highlights?.data?.length) {
    md += `## Highlights\n\n`;
    highlights.data.forEach((h) => {
      md += `- \`${formatTime(h.startTime)}\` ${h.text}\n`;
    });
    md += "\n";
  }

  // Transcript
  if (transcript?.data?.length) {
    md += `## Transcript\n\n`;
    let currentSpeaker = "";
    transcript.data.forEach((s) => {
      if (s.speaker !== currentSpeaker) {
        currentSpeaker = s.speaker;
        md += `\n**${s.speaker}** *(${formatTime(s.startTime)})*\n\n`;
      }
      md += `${s.text} `;
    });
  }

  return md.trim();
}

function exportToText(
  meeting: Meeting,
  transcript: TranscriptResponse | null,
  highlights: HighlightsResponse | null,
): string {
  let txt = `${meeting.name}\n${"=".repeat(meeting.name.length)}\n\n`;
  txt += `Date: ${formatDate(meeting.happenedAt, "absolute")}\n`;
  txt += `Duration: ${formatDuration(meeting.duration)}\n`;
  txt += `Organizer: ${meeting.organizer?.name || "Unknown"}\n`;

  if (meeting.invitees?.length > 0) {
    txt += `Participants: ${meeting.invitees.map((i) => i.name || i.email).join(", ")}\n`;
  }

  txt += `URL: ${meeting.url}\n\n`;

  // Highlights
  if (highlights?.data?.length) {
    txt += `HIGHLIGHTS\n${"-".repeat(10)}\n\n`;
    highlights.data.forEach((h) => {
      txt += `[${formatTime(h.startTime)}] ${h.text}\n`;
    });
    txt += "\n";
  }

  // Transcript
  if (transcript?.data?.length) {
    txt += `TRANSCRIPT\n${"-".repeat(10)}\n\n`;
    let currentSpeaker = "";
    transcript.data.forEach((s) => {
      if (s.speaker !== currentSpeaker) {
        currentSpeaker = s.speaker;
        txt += `\n[${formatTime(s.startTime)}] ${s.speaker}:\n`;
      }
      txt += `${s.text} `;
    });
  }

  return txt.trim();
}

function exportToJson(
  meeting: Meeting,
  transcript: TranscriptResponse | null,
  highlights: HighlightsResponse | null,
): string {
  const data = {
    meeting: {
      id: meeting.id,
      name: meeting.name,
      date: meeting.happenedAt,
      duration: meeting.duration,
      url: meeting.url,
      organizer: meeting.organizer,
      participants: meeting.invitees,
    },
    highlights: highlights?.data || [],
    transcript: transcript?.data || [],
  };

  return JSON.stringify(data, null, 2);
}

// Copy to clipboard with feedback
export async function copyToClipboard(
  content: string,
  label: string,
): Promise<void> {
  await Clipboard.copy(content);
  await showHUD(`Copied ${label} to clipboard`);
}

// Export transcript only
export function exportTranscript(
  transcript: TranscriptResponse,
  format: "markdown" | "txt",
): string {
  if (format === "markdown") {
    let md = "";
    let currentSpeaker = "";
    transcript.data.forEach((s) => {
      if (s.speaker !== currentSpeaker) {
        currentSpeaker = s.speaker;
        md += `\n### ${s.speaker} *(${formatTime(s.startTime)})*\n\n`;
      }
      md += `${s.text} `;
    });
    return md.trim();
  }

  let txt = "";
  let currentSpeaker = "";
  transcript.data.forEach((s) => {
    if (s.speaker !== currentSpeaker) {
      currentSpeaker = s.speaker;
      txt += `\n[${formatTime(s.startTime)}] ${s.speaker}:\n`;
    }
    txt += `${s.text} `;
  });
  return txt.trim();
}

// Export highlights only
export function exportHighlights(
  highlights: HighlightsResponse,
  format: "markdown" | "txt",
): string {
  if (format === "markdown") {
    return highlights.data
      .map((h) => `- \`${formatTime(h.startTime)}\` ${h.text}`)
      .join("\n");
  }
  return highlights.data
    .map((h) => `[${formatTime(h.startTime)}] ${h.text}`)
    .join("\n");
}

// Save export to file (opens save dialog)
export async function saveExport(
  content: string,
  filename: string,
  format: ExportFormat,
): Promise<void> {
  // For now, copy to clipboard - Raycast doesn't have native file save dialog
  await Clipboard.copy(content);
  await showToast({
    style: Toast.Style.Success,
    title: "Exported to clipboard",
    message: `${filename}.${format === "json" ? "json" : format === "markdown" ? "md" : "txt"}`,
  });
}
