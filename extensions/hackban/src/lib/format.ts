import { Color, Icon, List } from "@raycast/api";

export type DueState = "done" | "overdue" | "today" | "week" | "later" | "none";

const DAY = 86_400_000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dueState(due: string | null | undefined, complete: boolean | undefined): DueState {
  if (complete) return "done";
  if (!due) return "none";
  const t = new Date(due).getTime();
  const today = startOfToday();
  if (t < Date.now()) return "overdue";
  if (t < today + DAY) return "today";
  if (t < today + 7 * DAY) return "week";
  return "later";
}

const DUE_COLOR: Partial<Record<DueState, Color>> = {
  done: Color.Green,
  overdue: Color.Red,
  today: Color.Orange,
  week: Color.Yellow,
};

export function dueAccessory(due: string | null | undefined, complete: boolean | undefined): List.Item.Accessory[] {
  if (!due) return [];
  const state = dueState(due, complete);
  const date = new Date(due);
  return [
    {
      date: { value: date, color: DUE_COLOR[state] },
      tooltip: `${complete ? "Done · due" : "Due"} ${formatDate(date)}`,
    },
  ];
}

export function cardIcon(due: string | null | undefined, complete: boolean | undefined) {
  if (complete) return { source: Icon.CheckCircle, tintColor: Color.Green };
  const color = DUE_COLOR[dueState(due, complete)];
  return color ? { source: Icon.Circle, tintColor: color } : Icon.Circle;
}

export function formatDate(d: Date | string) {
  return new Date(d).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Hackban's label palette (the "mid" shades from LABEL_BASE in hackban's ui.tsx).
const LABEL_HEX: Record<string, string> = {
  green: "#4bce97",
  yellow: "#f5cd47",
  orange: "#fea362",
  red: "#f87168",
  purple: "#9f8fef",
  blue: "#579dff",
  sky: "#6cc3e0",
  lime: "#94c748",
  pink: "#e774bb",
  black: "#8590a2",
};

export function labelColor(color: string | null | undefined) {
  return color ? LABEL_HEX[color.split("_")[0]] : undefined;
}

/** Card lists only get each label's name, or its color when it has no name: show those as a colored dot. */
export function labelAccessories(labels: string[] | undefined): List.Item.Accessory[] {
  return (labels ?? []).slice(0, 3).map((l) => {
    const unnamed = /^[a-z]+(_light|_dark)?$/.test(l) ? labelColor(l) : undefined;
    return unnamed ? { icon: { source: Icon.CircleFilled, tintColor: unnamed }, tooltip: "Label" } : { tag: l };
  });
}
