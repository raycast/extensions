import { Color } from "@raycast/api";
import type { Player, PlayerStatus } from "../api/types";

/** FPL stores prices in tenths of a million, e.g. 77 -> £7.7m */
export const formatPrice = (tenths: number) => `£${(tenths / 10).toFixed(1)}m`;

export const formatPriceDelta = (tenths: number) => {
  if (tenths === 0) return "";
  return `${tenths > 0 ? "+" : "-"}${formatPrice(Math.abs(tenths))}`;
};

export const formatNumber = (n: number | null | undefined) => (n == null ? "-" : n.toLocaleString("en-GB"));

export const formatRankMove = (current: number | null, previous: number | null) => {
  if (current == null || previous == null || previous === 0) return "";
  const diff = previous - current;
  if (diff === 0) return "=";
  return diff > 0 ? `↑ ${formatNumber(diff)}` : `↓ ${formatNumber(-diff)}`;
};

export const formatKickoff = (iso: string | null) => {
  if (!iso) return "TBC";
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDeadline = (iso: string) => {
  const deadline = new Date(iso);
  const hoursLeft = (deadline.getTime() - Date.now()) / 36e5;
  const when = deadline.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (hoursLeft < 0) return when;
  if (hoursLeft < 1) return `${when} (${Math.round(hoursLeft * 60)} min left)`;
  if (hoursLeft < 48) return `${when} (${Math.round(hoursLeft)} h left)`;
  return `${when} (${Math.round(hoursLeft / 24)} days left)`;
};

/** Fixture Difficulty Rating colors, matching the FPL site */
export const fdrColor = (difficulty: number): Color => {
  switch (difficulty) {
    case 1:
      return Color.Green;
    case 2:
      return Color.Green;
    case 3:
      return Color.SecondaryText;
    case 4:
      return Color.Red;
    default:
      return Color.Magenta;
  }
};

export const statusLabel = (player: Player) => {
  const labels: Record<PlayerStatus, string> = {
    a: "Available",
    d: "Doubtful",
    i: "Injured",
    s: "Suspended",
    u: "Unavailable",
    n: "Not in squad",
  };
  const chance = player.chance_of_playing_next_round;
  const base = labels[player.status] ?? player.status;
  return player.status === "d" && chance != null ? `${base} (${chance}%)` : base;
};

export const statusColor = (status: PlayerStatus): Color => {
  switch (status) {
    case "a":
      return Color.Green;
    case "d":
      return Color.Yellow;
    default:
      return Color.Red;
  }
};

export const chipLabel = (chip: string | null | undefined) => {
  const labels: Record<string, string> = {
    wildcard: "Wildcard",
    freehit: "Free Hit",
    bboost: "Bench Boost",
    "3xc": "Triple Captain",
    manager: "Assistant Manager",
  };
  return chip ? (labels[chip] ?? chip) : "";
};

/** Likelihood is -5..5, negative means fall, positive means rise. */
export const likelihoodLabel = (likelihood: number) => {
  const magnitude = Math.abs(likelihood);
  if (magnitude >= 5) return "Very likely";
  if (magnitude >= 4) return "Likely";
  if (magnitude >= 3) return "Possible";
  if (magnitude >= 2) return "Unlikely";
  return "Very unlikely";
};

export const likelihoodColor = (likelihood: number): Color => {
  const magnitude = Math.abs(likelihood);
  if (magnitude >= 4) return likelihood > 0 ? Color.Green : Color.Red;
  if (magnitude >= 3) return Color.Yellow;
  return Color.SecondaryText;
};
