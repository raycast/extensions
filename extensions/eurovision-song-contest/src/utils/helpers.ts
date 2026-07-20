import { getCountryFlag } from "./getFlags";
import { getCountryName } from "./getcountry";

export function extractCountryCode(data: { countryCode?: string; country?: string }): string | undefined {
  return data.countryCode || (data.country?.length === 2 ? data.country : undefined);
}

export function formatCountryWithFlag(countryCode: string | undefined, countryName: string): string {
  const flag = getCountryFlag(countryCode);
  return flag ? `${flag} ${countryName}` : countryName;
}

export function formatRoundName(name: string): string {
  const roundNames: Record<string, string> = {
    final: "Grand Final",
    semifinal1: "Semi-Final 1",
    semifinal2: "Semi-Final 2",
    semifinal: "Semi-Final",
  };
  return roundNames[name] || name.charAt(0).toUpperCase() + name.slice(1);
}

export function getPlaceEmoji(place: number): string {
  if (place === 1) return "🏆 ";
  if (place === 2) return "🥈 ";
  if (place === 3) return "🥉 ";
  return "";
}

export function getCountryNameFromCode(countryCode: string | undefined, fallback?: string): string {
  return getCountryName(countryCode) || fallback || "";
}

export const ROUND_ORDER: Record<string, number> = { semifinal: 1, semifinal1: 2, semifinal2: 3, final: 4 };

export function sortRoundsByOrder<T extends { name?: string }>(rounds: T[]): T[] {
  return rounds
    .filter((round) => round.name)
    .sort((a, b) => (ROUND_ORDER[a.name || ""] || 99) - (ROUND_ORDER[b.name || ""] || 99));
}

export function isSemiFinalRound(roundName: string | undefined): boolean {
  return roundName === "semifinal" || roundName === "semifinal1" || roundName === "semifinal2";
}

export function matchesContestantId(contestantId: number | string | undefined, entryId: number): boolean {
  return contestantId !== undefined && (contestantId === entryId || String(contestantId) === String(entryId));
}
