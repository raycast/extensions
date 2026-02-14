import { RaycastEvent } from "../types";

type GroundedSummaryInput = {
  townName: string;
  query: string;
  events: RaycastEvent[];
};

type GroundedSummary = {
  title: string;
  subtitle: string;
};

const normalizeQueryLabel = (query: string): string => {
  const normalized = String(query || "").toLowerCase();
  if (normalized.includes("tonight")) return "tonight";
  if (normalized.includes("tomorrow")) return "tomorrow";
  if (normalized.includes("this weekend")) return "this weekend";
  if (normalized.includes("next week")) return "next week";
  if (normalized.includes("this week")) return "this week";
  return "in the next 7 days";
};

export const buildGroundedSummary = (
  input: GroundedSummaryInput,
): GroundedSummary => {
  const townName = String(input.townName || "your town");
  const timeframe = normalizeQueryLabel(input.query);
  const count = input.events.length;

  if (count === 0) {
    return {
      title: `No events found in ${townName}`,
      subtitle: `Try a broader search. Current window: ${timeframe}.`,
    };
  }

  return {
    title: `${count} event${count === 1 ? "" : "s"} in ${townName}`,
    subtitle: `Showing results for ${timeframe}. Use arrow keys to browse.`,
  };
};
