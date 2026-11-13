/** Which recent games to show. Chosen in the extension preferences. */
export type GameType = "all" | "solo" | "flex" | "ranked" | "aram" | "other";

interface GameTypeInfo {
  /** Shown in the preference dropdown and next to "Recent Matches". */
  title: string;
  /** Fits into "Last 20 ___ Matches". Empty for all games. */
  label: string;
  /** Riot's match-v5 list filter: one exact queue, or a match type. Applied by Riot, so "last 20" stays 20. */
  filter: { queue?: number; type?: "ranked" | "normal" };
}

export const GAME_TYPES: Record<GameType, GameTypeInfo> = {
  all: { title: "All Game Types", label: "", filter: {} },
  solo: { title: "Ranked Solo/Duo", label: "Solo/Duo", filter: { queue: 420 } },
  flex: { title: "Ranked Flex", label: "Flex", filter: { queue: 440 } },
  ranked: { title: "All Ranked (Solo/Duo and Flex)", label: "Ranked", filter: { type: "ranked" } },
  aram: { title: "ARAM", label: "ARAM", filter: { queue: 450 } },
  // Riot's "normal" type is everything that is not ranked, tournament or tutorial: normals, Arena, rotating modes.
  other: { title: "Normal and Other Modes (not ranked)", label: "Normal & Other", filter: { type: "normal" } },
};

export function isGameType(value: string): value is GameType {
  return Object.hasOwn(GAME_TYPES, value);
}
