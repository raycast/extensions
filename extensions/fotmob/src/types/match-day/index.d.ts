import type { MatchFixture } from "../team-detail";

export type MatchDayResponse = {
  leagues: MatchDayLeague[];
};

export type MatchDayLeague = {
  id: number;
  primaryId: number;
  name: string;
  matches: MatchFixture[];
  isGroup: boolean | null;
  parentLeagueName: string | null;
};
