import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  Clipboard,
  showHUD,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useCallback } from "react";

type AverageMode = "rolling" | "cumulative";

interface Preferences {
  defaultMode: AverageMode;
  rollingWindowSize: string;
}

const AUTO_RESET_MS = 3000;

function calculateBPM(intervals: number[]): number {
  if (intervals.length === 0) return 0;
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return (60 * 1000) / avgInterval;
}

function calculateStdDev(intervals: number[]): number {
  if (intervals.length < 2) return 0;
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const squaredDiffs = intervals.map((i) => Math.pow(i - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / intervals.length;
  return Math.sqrt(avgSquaredDiff);
}

function getStabilityRating(stdDev: number, avgInterval: number): { label: string; color: Color } {
  if (avgInterval === 0) return { label: "—", color: Color.SecondaryText };
  const coefficient = stdDev / avgInterval;
  if (coefficient < 0.05) return { label: "Excellent", color: Color.Green };
  if (coefficient < 0.1) return { label: "Good", color: Color.Blue };
  if (coefficient < 0.2) return { label: "Fair", color: Color.Yellow };
  return { label: "Poor", color: Color.Red };
}

function getTempoMarking(bpm: number): string {
  if (bpm < 40) return "Grave";
  if (bpm < 60) return "Largo";
  if (bpm < 66) return "Larghetto";
  if (bpm < 76) return "Adagio";
  if (bpm < 108) return "Andante";
  if (bpm < 120) return "Moderato";
  if (bpm < 156) return "Allegro";
  if (bpm < 176) return "Vivace";
  if (bpm < 200) return "Presto";
  return "Prestissimo";
}

function formatBPM(bpm: number, showDecimal: boolean): string {
  return showDecimal ? bpm.toFixed(1) : Math.round(bpm).toString();
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const rollingWindowSize = parseInt(preferences.rollingWindowSize, 10) || 4;
  const defaultMode = preferences.defaultMode || "rolling";

  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [mode, setMode] = useState<AverageMode>(defaultMode);
  const [showDecimal, setShowDecimal] = useState(false);

  const intervals = timestamps.slice(1).map((t, i) => t - timestamps[i]);
  const rollingIntervals = intervals.length > rollingWindowSize ? intervals.slice(-rollingWindowSize) : intervals;
  const activeIntervals = mode === "rolling" ? rollingIntervals : intervals;

  const bpm = calculateBPM(activeIntervals);
  const avgInterval =
    activeIntervals.length > 0 ? activeIntervals.reduce((a, b) => a + b, 0) / activeIntervals.length : 0;
  const stdDev = calculateStdDev(activeIntervals);
  const stability = getStabilityRating(stdDev, avgInterval);

  const tap = useCallback(() => {
    const now = Date.now();
    setTimestamps((prev) => {
      if (prev.length > 0 && now - prev[prev.length - 1] > AUTO_RESET_MS) {
        return [now];
      }
      return [...prev, now];
    });
  }, []);

  const reset = useCallback(() => {
    setTimestamps([]);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "rolling" ? "cumulative" : "rolling"));
    setTimestamps([]);
  }, []);

  const togglePrecision = useCallback(() => {
    setShowDecimal((prev) => !prev);
  }, []);

  const copyBPM = useCallback(async () => {
    const value = formatBPM(bpm, showDecimal);
    await Clipboard.copy(value);
    await showHUD(`Copied ${value} BPM`);
  }, [bpm, showDecimal]);

  const tapCount = timestamps.length;
  const averagedBeats = activeIntervals.length;
  const modeLabel = mode === "rolling" ? `Rolling (${rollingWindowSize})` : "Cumulative";
  const displayedBpmValue = showDecimal ? bpm : Math.round(bpm);
  const displayBPM = formatBPM(bpm, showDecimal);
  const msPerBeat = displayedBpmValue > 0 ? Math.round(60000 / displayedBpmValue) : 0;

  const markdown =
    bpm > 0 ? `# ${displayBPM} BPM\n\n**${getTempoMarking(bpm)}**` : `# Tap Tempo\n\nPress **Enter** to tap the beat`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        bpm > 0 ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Half Time"
              text={formatBPM((showDecimal ? bpm : Math.round(bpm)) / 2, true)}
            />
            <Detail.Metadata.Label title="Double Time" text={formatBPM(bpm * 2, showDecimal)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Ms per Beat" text={`${msPerBeat} ms`} />
            <Detail.Metadata.Label
              title="Stability"
              text={stability.label}
              icon={{ source: Icon.Circle, tintColor: stability.color }}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Mode" text={modeLabel} />
            <Detail.Metadata.Label
              title={mode === "rolling" ? "Averaged Beats" : "Total Taps"}
              text={mode === "rolling" ? `${averagedBeats} of ${rollingWindowSize}` : String(tapCount)}
            />
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action title="Tap" onAction={tap} icon={Icon.Circle} />
          <Action
            title="Copy BPM"
            onAction={copyBPM}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title={`Switch to ${mode === "rolling" ? "Cumulative" : "Rolling"}`}
            onAction={toggleMode}
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
          <Action
            title={showDecimal ? "Hide Decimal" : "Show Decimal"}
            onAction={togglePrecision}
            icon={Icon.Number00}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action
            title="Reset"
            onAction={reset}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action title="Settings" onAction={openExtensionPreferences} icon={Icon.Gear} />
        </ActionPanel>
      }
    />
  );
}
