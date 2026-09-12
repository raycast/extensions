import { getPreferenceValues } from "@raycast/api";
import { Step } from "./api/types";

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (m > 0) {
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${s}s`;
}

export function formatDistance(meters: number): string {
  const { distanceUnit } = getPreferenceValues<Preferences>();
  if (distanceUnit === "mi") {
    return `${(meters / 1609.34).toFixed(2)} mi`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatSpeed(
  metersPerSecond: number,
  sportType: string,
): string {
  const { distanceUnit } = getPreferenceValues<Preferences>();

  if (metersPerSecond === 0) return "";

  if (sportType === "run" || sportType === "swim") {
    const pace = 1 / (metersPerSecond * 0.06);
    if (distanceUnit === "mi") {
      const paceMiles = pace * 1.60934;
      return `${Math.floor(paceMiles)}:${String(Math.floor((paceMiles % 1) * 60)).padStart(2, "0")} /mi`;
    }
    return `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, "0")} /km`;
  }

  if (distanceUnit === "mi") {
    return `${(metersPerSecond * 2.23694).toFixed(1)} mph`;
  }
  return `${(metersPerSecond * 3.6).toFixed(1)} km/h`;
}

export function formatElevationGain(meters: number): string {
  const { distanceUnit } = getPreferenceValues<Preferences>();
  if (distanceUnit === "mi") {
    return `${(meters * 3.28084).toFixed(0)} ft`;
  }
  return `${Math.round(meters)} m`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export function formatSectionDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  if (date.getTime() === today.getTime()) return `Today — ${monthDay}`;
  if (date.getTime() === tomorrow.getTime()) return `Tomorrow — ${monthDay}`;
  if (date.getTime() === yesterday.getTime()) return `Yesterday — ${monthDay}`;
  return `${dayName} — ${monthDay}`;
}

export function getDateRange(
  pastDays: number,
  futureDays = 30,
): { from: string; to: string } {
  const from = new Date();
  from.setDate(from.getDate() - pastDays);
  const to = new Date();
  to.setDate(to.getDate() + futureDays);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}
function formatEndCondition(step: {
  endCondition: string;
  endConditionValue?: number | null;
}): string {
  if (step.endConditionValue == null)
    return step.endCondition === "open" ? "open" : "";
  switch (step.endCondition) {
    case "distance":
      return step.endConditionValue >= 1000
        ? `${(step.endConditionValue / 1000).toFixed(1)}km`
        : `${step.endConditionValue}m`;
    case "time":
      return formatDuration(step.endConditionValue);
    case "iterations":
      return `${step.endConditionValue}x`;
    default:
      return String(step.endConditionValue);
  }
}

function formatStepLine(step: {
  stepType: string;
  displayName?: string | null;
  endCondition: string;
  endConditionValue?: number | null;
}): string {
  const name = step.displayName || step.stepType;
  const condition = formatEndCondition(step);
  return condition ? `${name} — ${condition}` : name;
}

export function formatStepsMarkdown(steps: Step[]): string {
  const lines: string[] = [];
  for (const step of steps) {
    if (step.stepType === "repeat") {
      lines.push(`**${step.numberOfIterations}x Repeat:**`);
      for (const sub of step.workoutSteps) {
        lines.push(`  - ${formatStepLine(sub)}`);
      }
    } else {
      lines.push(`- ${formatStepLine(step)}`);
    }
  }
  return lines.join("  \n");
}
