import { useAPI } from "./use-api";

export function useSchedule(leagueId: string) {
  const { data, isLoading } = useAPI<ScheduleResponse>({
    query: "getSchedule",
    params: { leagueId },
  });

  return {
    schedule: data?.data.schedule,
    isLoading,
  };
}

export interface ScheduleResponse {
  data: {
    schedule: {
      pages: Pages;
      events: Event[];
    };
  };
}

export interface Pages {
  older: string;
  newer: null;
}

export interface Event {
  startTime: string;
  state: string;
  type: string;
  blockName: string;
  league: League;
  match: Match;
}

export interface League {
  name: string;
  slug: string;
}

export interface Match {
  id: string;
  flags: string[];
  teams: TeamsItem[];
  strategy: Strategy;
}

export interface TeamsItem {
  name: string;
  code: string;
  image: string;
  result: Result | null;
  record: Record | null;
}

export interface Result {
  outcome: string | null;
  gameWins: number;
}

export interface Record {
  wins: number;
  losses: number;
}

export interface Strategy {
  type: string;
  count: number;
}
