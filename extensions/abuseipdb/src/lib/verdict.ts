import { Color, Icon } from "@raycast/api";

export type Verdict = {
  label: string;
  color: Color;
  icon: Icon;
};

export function verdictFor(score: number): Verdict {
  if (score === 0) {
    return { label: "Clean", color: Color.Green, icon: Icon.CheckCircle };
  }
  if (score < 25) {
    return { label: "Low Risk", color: Color.Yellow, icon: Icon.Info };
  }
  if (score < 75) {
    return { label: "Suspicious", color: Color.Orange, icon: Icon.Warning };
  }
  return { label: "Malicious", color: Color.Red, icon: Icon.XMarkCircle };
}

/** Ten-block bar, e.g. 63% -> ▰▰▰▰▰▰▱▱▱▱ */
export function scoreBar(score: number): string {
  const filled = Math.round(Math.min(Math.max(score, 0), 100) / 10);
  return "▰".repeat(filled) + "▱".repeat(10 - filled);
}
