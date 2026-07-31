import { copyFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { readMarkers } from "./state";
import { Preferences, RecordingState, TranscriptSegment } from "./types";

interface ReportMoment {
  timestampMs: number;
  screenshotPath: string;
  text: string;
  source: "marked" | "automatic";
}

function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function textNear(segments: TranscriptSegment[], timestampMs: number): string {
  const overlapping = segments.filter(
    (segment) =>
      segment.fromMs <= timestampMs + 4_000 &&
      segment.toMs >= timestampMs - 4_000,
  );
  if (overlapping.length)
    return overlapping.map((segment) => segment.text).join(" ");
  return segments.reduce(
    (closest, segment) => {
      const distance = Math.abs(
        (segment.fromMs + segment.toMs) / 2 - timestampMs,
      );
      return distance < closest.distance
        ? { distance, text: segment.text }
        : closest;
    },
    { distance: Number.POSITIVE_INFINITY, text: "" },
  ).text;
}

function sampleEvenly<T>(items: T[], maximum: number): T[] {
  if (items.length <= maximum) return items;
  if (maximum === 1) return [items[Math.floor(items.length / 2)]];
  const result: T[] = [];
  for (let index = 0; index < maximum; index++) {
    const sourceIndex = Math.round(
      (index * (items.length - 1)) / (maximum - 1),
    );
    result.push(items[sourceIndex]);
  }
  return result;
}

export async function buildReport(
  state: RecordingState,
  preferences: Preferences,
  segments: TranscriptSegment[],
): Promise<{ markdown: string; reportPath: string }> {
  const markers = readMarkers(state);
  const moments: ReportMoment[] = [];

  if (markers.length) {
    markers.forEach((marker, index) => {
      const destination = join(
        state.sessionDir,
        "frames",
        `marked-${String(index + 1).padStart(2, "0")}.png`,
      );
      copyFileSync(marker.screenshotPath, destination);
      moments.push({
        timestampMs: marker.timestampMs,
        screenshotPath: destination,
        text: textNear(segments, marker.timestampMs),
        source: "marked",
      });
    });
  } else {
    const maximum = Math.max(
      1,
      Math.min(20, Number.parseInt(preferences.maxFrames, 10) || 8),
    );
    const candidates = readdirSync(join(state.sessionDir, "automatic"))
      .map((name) => ({ name, match: /^frame-(\d+)\.png$/.exec(name) }))
      .filter(
        (candidate): candidate is { name: string; match: RegExpExecArray } =>
          Boolean(candidate.match),
      )
      .map((candidate) => ({
        name: candidate.name,
        timestampMs: Number(candidate.match[1]),
      }))
      .sort((a, b) => a.timestampMs - b.timestampMs);
    const selected = sampleEvenly(candidates, maximum);
    for (let index = 0; index < selected.length; index++) {
      const candidate = selected[index];
      const screenshotPath = join(
        state.sessionDir,
        "frames",
        `automatic-${String(index + 1).padStart(2, "0")}.png`,
      );
      copyFileSync(
        join(state.sessionDir, "automatic", candidate.name),
        screenshotPath,
      );
      moments.push({
        timestampMs: candidate.timestampMs,
        screenshotPath,
        text: textNear(segments, candidate.timestampMs),
        source: "automatic",
      });
    }
  }

  const title = `UI Feedback — ${new Date(state.startedAt).toLocaleString()}`;
  const lines = [
    `# ${title}`,
    "",
    "Please implement the feedback below. The recording, transcript, and screenshots are local files on this machine.",
    "",
    `- Recording: \`${state.videoPath}\``,
    state.sourceApplication
      ? `- Source application: ${state.sourceApplication}`
      : undefined,
    state.sourceBundleId
      ? `- Source bundle: ${state.sourceBundleId}`
      : undefined,
    `- Capture started: ${state.startedAt}`,
    "",
    "## Feedback moments",
    "",
  ].filter((line): line is string => line !== undefined);

  moments.forEach((moment, index) => {
    lines.push(
      `### ${index + 1}. ${formatTimestamp(moment.timestampMs)}${moment.source === "marked" ? " — manually marked" : ""}`,
      "",
      moment.text || "Review the highlighted moment in the screenshot.",
      "",
      `![Feedback frame at ${formatTimestamp(moment.timestampMs)}](<${moment.screenshotPath}>)`,
      "",
    );
  });

  lines.push("## Full transcript", "");
  if (segments.length === 0) {
    lines.push("_No speech detected._", "");
  } else {
    for (const segment of segments) {
      lines.push(`[${formatTimestamp(segment.fromMs)}] ${segment.text}`, "");
    }
  }

  const markdown = `${lines.join("\n").trim()}\n`;
  const reportPath = join(state.sessionDir, "feedback.md");
  writeFileSync(reportPath, markdown);
  return { markdown, reportPath };
}
