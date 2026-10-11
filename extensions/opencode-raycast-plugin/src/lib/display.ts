import { Color, Icon } from "@raycast/api";
import { countdown, percentText } from "./format";
import type { PickKind, Usage } from "./types";

export function progressIcon(pct: number): Icon {
  const step = Math.min(4, Math.max(1, Math.round(pct / 25)));
  return [
    Icon.CircleProgress25,
    Icon.CircleProgress50,
    Icon.CircleProgress75,
    Icon.CircleProgress100,
  ][step - 1];
}

export interface WindowRow {
  key: string;
  title: string;
  subtitle: string;
  pct: number;
}

export function windowRows(windows: Usage, now: Date): WindowRow[] {
  const defs = [
    { key: "rolling", name: "Rolling 5h", w: windows.rolling },
    { key: "weekly", name: "Weekly", w: windows.weekly },
    { key: "monthly", name: "Monthly", w: windows.monthly },
  ];
  return defs.map(({ key, name, w }) => ({
    key,
    pct: w.percent,
    title: `${name} · ${percentText(w.percent)}`,
    subtitle: `${countdown(w.resetsAt, now)}${w.status === "rate-limited" ? " · rate-limited" : ""}`,
  }));
}

export const PICK_LABEL: Record<PickKind, string> = {
  stretch: "Stretch",
  "best-value": "Best value",
};
export const PICK_ICON: Record<PickKind, Icon> = {
  stretch: Icon.Star,
  "best-value": Icon.StarCircle,
};
export const PICK_COLOR: Record<PickKind, Color> = {
  stretch: Color.Green,
  "best-value": Color.Blue,
};

export function pickLabel(kind: PickKind): string {
  return PICK_LABEL[kind];
}
