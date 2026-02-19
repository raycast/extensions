import { Color, Icon } from "@raycast/api";

export const API_BASE_URL = "https://api.ticktick.com/open/v1";

export const PRIORITY_LABELS: Record<number, string> = {
  0: "None",
  1: "Low",
  3: "Medium",
  5: "High",
};

// Semantically distinct colors optimized for quick scanning:
// None  → secondary (neutral, low visual weight)
// Low   → blue (calm, informational)
// Medium → orange (warm urgency, distinct from red)
// High  → red (critical, universal danger signal)
export const PRIORITY_COLORS: Record<number, Color> = {
  0: Color.SecondaryText,
  1: Color.Blue,
  3: Color.Orange,
  5: Color.Red,
};

export const PRIORITY_ICONS: Record<number, Icon> = {
  0: Icon.Circle,
  1: Icon.CircleFilled,
  3: Icon.CircleFilled,
  5: Icon.CircleFilled,
};

export const PRIORITY_OPTIONS = [
  { title: "None", value: "0" },
  { title: "Low", value: "1" },
  { title: "Medium", value: "3" },
  { title: "High", value: "5" },
];

// Session type metadata for Focus Timer — centralised so TimerView and the
// selection list stay in sync without duplicating strings.
export const SESSION_CONFIG = {
  focus: {
    label: "Focus",
    icon: Icon.BullsEye,
    color: Color.Red,
    description: "Deep work session",
  },
  shortBreak: {
    label: "Short Break",
    icon: Icon.MugSteam,
    color: Color.Green,
    description: "Quick recharge",
  },
  longBreak: {
    label: "Long Break",
    icon: Icon.Tree,
    color: Color.Blue,
    description: "Extended rest after 4 sessions",
  },
} as const;
