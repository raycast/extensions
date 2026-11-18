import type { Airline } from "soaring-symbols";

export const getFlagEmoji = (isoCode?: string) => {
  if (!isoCode) return "🏴";

  if (isoCode === "GB-ENG") {
    return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  }
  if (isoCode === "GB-WLS") {
    return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";
  }
  if (isoCode === "GB-SCT") {
    return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  }
  if (isoCode === "GB-NIR") {
    // The only official flag in Northern Ireland is the Union Flag of the United Kingdom.
    return "🇬🇧";
  }

  return isoCode.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
};

// "1956", or "1946–2019" for an airline that has ceased operations;
// undefined when neither year is known
export const operatingYears = ({ founded, ceased }: Pick<Airline, "founded" | "ceased">) =>
  ceased ? `${founded ?? "?"}–${ceased}` : founded ? String(founded) : undefined;

// "Ceased 2017" for an airline that no longer flies, "Defunct" when the
// year is unknown, and undefined for one still flying
export const ceasedLabel = ({ defunct, ceased }: Pick<Airline, "defunct" | "ceased">) =>
  ceased ? `Ceased ${ceased}` : defunct ? "Defunct" : undefined;
