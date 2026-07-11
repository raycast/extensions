export const dbInfoPrefix = "db-info-";

export const tagColors: Record<string, string> = {
  // Tier
  native: "#008000",
  platinum: "#b4c7dc",
  gold: "#cfb53b",
  silver: "#a6a6a6",
  bronze: "#cd7f32",
  pending: "#444444",
  broked: "#ff0000",

  // Confidence
  inadequate: "#ff0000",
  low: "#ff6600",
  moderate: "#ffff00",
  good: "#99ff00",
  strong: "#00ff00",
};

export const scoreColors = (score: number) => {
  if (score < 0.1) return "#ff0000";
  if (score < 0.2) return "#ff3300";
  if (score < 0.3) return "#ff6600";
  if (score < 0.4) return "#ff9900";
  if (score < 0.5) return "#ffcc00";
  if (score < 0.6) return "#ffff00";
  if (score < 0.7) return "#ccff00";
  if (score < 0.8) return "#99ff00";
  if (score < 0.9) return "#66ff00";
  if (score < 1.0) return "#33ff00";
  return "#00ff00";
};
