export type ModeDetails = {
  color: string;
  emoji: string;
};

export enum Mode {
  "bus" = "bus",
  "cable-car" = "cable-car",
  "coach" = "coach",
  "cycle" = "cycle",
  "cycle-hire" = "cycle-hire",
  "dlr" = "dlr",
  "elizabeth-line" = "elizabeth-line",
  "interchange-keep-sitting" = "interchange-keep-sitting",
  "interchange-secure" = "interchange-secure",
  "national-rail" = "national-rail",
  "overground" = "overground",
  "replacement-bus" = "replacement-bus",
  "river-bus" = "river-bus",
  "river-tour" = "river-tour",
  "taxi" = "taxi",
  "tram" = "tram",
  "tube" = "tube",
  "walking" = "walking",
  "plane" = "plane",
}

export const ModeDetails: { [key in Mode]: ModeDetails } = {
  bus: { color: "#E41F1F", emoji: "🚌" }, // Red
  "cable-car": { color: "#F3A72F", emoji: "🚡" }, // Orange
  coach: { color: "#074984", emoji: "🚍" }, // Dark Blue
  cycle: { color: "#069E28", emoji: "🚲" }, // Green
  "cycle-hire": { color: "#00A0E2", emoji: "🚴" }, // Light Blue
  dlr: { color: "#00ADA3", emoji: "🚈" }, // Aqua
  "elizabeth-line": { color: "#9364CD", emoji: "🚆" }, // Violet
  "interchange-keep-sitting": { color: "#757575", emoji: "💺" }, // Grey
  "interchange-secure": { color: "#4A4A4A", emoji: "🔐" }, // Dark Grey
  "national-rail": { color: "#005D96", emoji: "🚈" }, // Blue
  overground: { color: "#EE7C0E", emoji: "🚊" }, // Orange
  "replacement-bus": { color: "#E41F1F", emoji: "🚌" }, // Red
  "river-bus": { color: "#005674", emoji: "⛴️" }, // Dark Cyan
  "river-tour": { color: "#0073A8", emoji: "🛥️" }, // Blue
  taxi: { color: "#FFD329", emoji: "🚖" }, // Yellow
  tram: { color: "#00B36B", emoji: "🚋" }, // Green
  tube: { color: "#05109A", emoji: "🚇" }, // Dark Blue
  walking: { color: "#6D6D6D", emoji: "🚶" }, // Grey
  plane: { color: "#3A86FF", emoji: "🛩️" }, // Blue
};

export const getModeColor = (mode: string): string => {
  const details = ModeDetails[mode as Mode];
  if (!details) {
    console.error(`Mode not found for color: ${mode}`);
    return "#000000"; // default to black if mode is not found
  }
  return details.color;
};

export const getModeEmoji = (mode: string): string => {
  const details = ModeDetails[mode as Mode];
  if (!details) {
    console.error(`Mode not found for emoji: ${mode}`);
    return ""; // default to empty if mode is not found
  }
  return details.emoji;
};
