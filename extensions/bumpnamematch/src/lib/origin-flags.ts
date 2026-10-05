// Soft visual aid only: a best-effort flag for an origin. These are NOT literal
// — e.g. "Hebrew" → Israel, "Romansh" → Switzerland — they just help scanning
// the list. Pan-ethnic / ancient / multi-country origins (Arabic, Latin,
// Native American, Slavic, Scandinavian, Aztec, …) intentionally have no flag
// and fall back to a globe icon.
//
// Matched on the BASE origin (the part before " - "), so subregion variants like
// "French - Breton" or "German - Old High German" inherit the base flag.
const ORIGIN_FLAGS: Record<string, string> = {
  american: "🇺🇸",
  english: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  irish: "🇮🇪",
  scottish: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  welsh: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  french: "🇫🇷",
  german: "🇩🇪",
  italian: "🇮🇹",
  spanish: "🇪🇸",
  portuguese: "🇵🇹",
  dutch: "🇳🇱",
  greek: "🇬🇷",
  russian: "🇷🇺",
  polish: "🇵🇱",
  hungarian: "🇭🇺",
  bulgarian: "🇧🇬",
  albanian: "🇦🇱",
  armenian: "🇦🇲",
  estonian: "🇪🇪",
  lithuanian: "🇱🇹",
  romansh: "🇨🇭",
  hebrew: "🇮🇱",
  persian: "🇮🇷",
  turkish: "🇹🇷",
  egyptian: "🇪🇬",
  indian: "🇮🇳",
  indonesian: "🇮🇩",
  filipino: "🇵🇭",
  chinese: "🇨🇳",
  japanese: "🇯🇵",
  korean: "🇰🇷",
  vietnamese: "🇻🇳",
  cambodian: "🇰🇭",
  thai: "🇹🇭",
  mongolian: "🇲🇳",
};

/**
 * Best-effort flag emoji for an origin, or `undefined` when there's no sensible
 * one (caller should fall back to a globe icon). Matches on the base origin.
 */
export function originFlag(origin: string): string | undefined {
  const base = origin.split(" - ")[0].trim().toLowerCase();
  return ORIGIN_FLAGS[base];
}
