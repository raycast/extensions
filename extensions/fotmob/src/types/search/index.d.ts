import type { List } from "@raycast/api";

// Common
export type SearchSuggestResponse<Option> = {
  text: string;
  offset: number;
  length: number;
  options: Option[];
};

// League Suggestions
export type LeagueSuggestOption = {
  text: string;
  score: number;
  payload: LeagueSuggestPayload;
};

export type LeagueSuggestPayload = {
  matchDate: string;
  id: string;
  countryCode: string;
};

// Matches Suggestions
export type MatchSuggestOption = {
  text: string;
  score: number;
  payload: MatchSuggestPayload;
};

export type MatchSuggestPayload = {
  awayName: string;
  awayTeamId: string;
  awayScore?: number;
  homeName: string;
  homeTeamId: string;
  homeScore?: number;
  matchDate: string;
  leagueId: number;
  leagueName: string;
  id: string;
  statusId: number;
};

// Teams Suggestions
export type TeamSuggestOption = {
  text: string;
  score: number;
  payload: TeamSuggestPayload;
};

export type TeamSuggestPayload = {
  matchDate: string;
  leagueId: number;
  id: string;
  newsLanguages: string[];
};

export type PlayerSuggestOption = {
  text: string;
  score: number;
  payload: PlayerSuggestPayload;
};

export type PlayerSuggestPayload = {
  matchDate: string;
  id: string;
  newsLanguages: string[];
  isCoach: boolean;
  teamId?: number;
  teamName?: string;
};

// Convenience
export type LeagueSuggestResponse = SearchSuggestResponse<LeagueSuggestOption>;
export type MatchSuggestResponse = SearchSuggestResponse<MatchSuggestOption>;
export type TeamSuggestResponse = SearchSuggestResponse<TeamSuggestOption>;
export type PlayerSuggestResponse = SearchSuggestResponse<PlayerSuggestOption>;

// Response
export type SearchResponse = {
  took: number;
  leagueSuggest: [LeagueSuggestResponse] | null;
  matchSuggest: [MatchSuggestResponse] | null;
  teamSuggest: [TeamSuggestResponse] | null;
  squadMemberSuggest: [PlayerSuggestResponse] | null;
};

// View Model
export type SearchResultSection = {
  title: string;
  items: SearchResultItem[];
};

export type SearchResultItem = {
  title: string;
  iamgeUrl: string;
  subtitle: string;
  accessories: List.Item.Accessory[];
  raw: unknown;
} & (
  | {
      type: "league";
      payload: LeagueSuggestPayload;
    }
  | {
      type: "match";
      payload: MatchSuggestPayload;
    }
  | {
      type: "team";
      payload: TeamSuggestPayload;
    }
  | {
      type: "player";
      payload: PlayerSuggestPayload;
    }
);
