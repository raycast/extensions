import { copyFileSync, existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { AttentionMoment, detectAttentionMoments } from "./attention-cues";
import { loadDomContextTimeline } from "./dom-context";
import { runFile } from "./process";
import { readMarkers } from "./state";
import {
  DomContextTarget,
  Preferences,
  RecordingState,
  TranscriptSegment,
} from "./types";

interface ReportMoment {
  timestampMs: number;
  screenshotPath: string;
  text: string;
  source: "marked" | "attention" | "automatic";
  voiceCue?: string;
  domTarget?: DomContextTarget;
}

interface AutomaticFrame {
  name: string;
  timestampMs: number;
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

function automaticFrames(state: RecordingState): AutomaticFrame[] {
  return readdirSync(join(state.sessionDir, "automatic"))
    .map((name) => ({ name, match: /^frame-(\d+)\.png$/.exec(name) }))
    .filter(
      (candidate): candidate is { name: string; match: RegExpExecArray } =>
        Boolean(candidate.match),
    )
    .map((candidate) => ({
      name: candidate.name,
      timestampMs: Number(candidate.match[1]),
    }))
    .sort((left, right) => left.timestampMs - right.timestampMs);
}

function nearestFrame(
  frames: AutomaticFrame[],
  timestampMs: number,
): AutomaticFrame | undefined {
  return frames.reduce<AutomaticFrame | undefined>((nearest, frame) => {
    if (!nearest) return frame;
    return Math.abs(frame.timestampMs - timestampMs) <
      Math.abs(nearest.timestampMs - timestampMs)
      ? frame
      : nearest;
  }, undefined);
}

function resolveFfmpegPath(): string | undefined {
  return ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"].find(existsSync);
}

async function captureAttentionFrame(
  state: RecordingState,
  cue: AttentionMoment,
  frames: AutomaticFrame[],
  destination: string,
): Promise<boolean> {
  const ffmpegPath = resolveFfmpegPath();
  if (ffmpegPath) {
    try {
      await runFile(ffmpegPath, [
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        (cue.timestampMs / 1000).toFixed(3),
        "-i",
        state.videoPath,
        "-frames:v",
        "1",
        "-y",
        destination,
      ]);
      if (existsSync(destination)) return true;
    } catch {
      // Fall back to the nearest periodic frame below.
    }
  }

  const nearest = nearestFrame(frames, cue.timestampMs);
  if (!nearest) return false;
  copyFileSync(join(state.sessionDir, "automatic", nearest.name), destination);
  return true;
}

function formatAttributes(attributes: Record<string, string>): string {
  const entries = Object.entries(attributes);
  return entries.length
    ? entries
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
        .join(", ")
    : "none";
}

function pushDomTarget(lines: string[], target: DomContextTarget): void {
  lines.push(
    "**Hovered DOM target**",
    "",
    `- Page: \`${target.pageUrl}\``,
    `- Selector: \`${target.selector}\``,
    `- Element: \`${target.signature}\``,
    `- Visible text: ${target.text ? JSON.stringify(target.text) : "none"}`,
    `- Attributes: ${formatAttributes(target.attributes)}`,
    `- Ancestors (nearest first): ${target.ancestors.length ? target.ancestors.map((ancestor) => `\`${ancestor}\``).join(" ← ") : "none"}`,
    "",
  );
}

export async function buildReport(
  state: RecordingState,
  preferences: Preferences,
  segments: TranscriptSegment[],
): Promise<{ markdown: string; reportPath: string }> {
  const markers = readMarkers(state);
  const domTimeline = loadDomContextTimeline(state);
  const moments: ReportMoment[] = [];
  const maximum = Math.max(
    1,
    Math.min(20, Number.parseInt(preferences.maxFrames, 10) || 8),
  );
  const candidates = automaticFrames(state);

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
        domTarget: domTimeline.at(marker.timestampMs),
      });
    });
  }

  const attentionCues = detectAttentionMoments(segments)
    .filter(
      (cue) =>
        !markers.some(
          (marker) => Math.abs(marker.timestampMs - cue.timestampMs) < 3_000,
        ),
    )
    .slice(0, maximum);
  for (let index = 0; index < attentionCues.length; index++) {
    const cue = attentionCues[index];
    const screenshotPath = join(
      state.sessionDir,
      "frames",
      `attention-${String(index + 1).padStart(2, "0")}.png`,
    );
    if (!(await captureAttentionFrame(state, cue, candidates, screenshotPath)))
      continue;
    moments.push({
      timestampMs: cue.timestampMs,
      screenshotPath,
      text: textNear(segments, cue.timestampMs),
      source: "attention",
      voiceCue: cue.cue,
      domTarget: domTimeline.at(cue.timestampMs),
    });
  }

  if (markers.length === 0) {
    const remainingCandidates = candidates.filter((candidate) =>
      moments.every(
        (moment) =>
          Math.abs(moment.timestampMs - candidate.timestampMs) >= 3_000,
      ),
    );
    const selected = sampleEvenly(
      remainingCandidates,
      Math.max(0, maximum - moments.length),
    );
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
        domTarget: domTimeline.at(candidate.timestampMs),
      });
    }
  }

  moments.sort((left, right) => left.timestampMs - right.timestampMs);

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
    domTimeline.connected
      ? "- DOM context: connected (framework-agnostic hover capture)"
      : undefined,
    "",
    "## Feedback moments",
    "",
  ].filter((line): line is string => line !== undefined);

  moments.forEach((moment, index) => {
    const sourceLabel =
      moment.source === "marked"
        ? " — manually marked"
        : moment.source === "attention"
          ? ` — voice cue: “${moment.voiceCue}”`
          : "";
    lines.push(
      `### ${index + 1}. ${formatTimestamp(moment.timestampMs)}${sourceLabel}`,
      "",
      moment.text || "Review the highlighted moment in the screenshot.",
      "",
    );
    if (moment.domTarget) pushDomTarget(lines, moment.domTarget);
    lines.push(
      `![Feedback frame at ${formatTimestamp(moment.timestampMs)}](<${moment.screenshotPath}>)`,
      "",
    );
  });

  lines.push("## Full transcript", "");
  if (segments.length === 0) {
    lines.push("_No speech detected._", "");
  } else {
    let previousDomKey = "";
    for (const segment of segments) {
      lines.push(`[${formatTimestamp(segment.fromMs)}] ${segment.text}`, "");
      const target = domTimeline.at((segment.fromMs + segment.toMs) / 2);
      const domKey = target ? `${target.pageUrl}\n${target.selector}` : "";
      if (target && domKey !== previousDomKey) {
        lines.push(
          `DOM at this point: \`${target.selector}\` on \`${target.pageUrl}\` (${target.signature})`,
          "",
        );
      }
      previousDomKey = domKey;
    }
  }

  const markdown = `${lines.join("\n").trim()}\n`;
  const reportPath = join(state.sessionDir, "feedback.md");
  writeFileSync(reportPath, markdown);
  return { markdown, reportPath };
}
