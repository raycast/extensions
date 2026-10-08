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

interface Pages {
  older: string;
  newer: null;
}

interface Event {
  startTime: string;
  state: string;
  type: string;
  blockName: string;
  league: League;
  match: Match;
}

interface League {
  name: string;
  slug: string;
}

interface Match {
  id: string;
  flags: string[];
  teams: TeamsItem[];
  strategy: Strategy;
}

interface TeamsItem {
  name: string;
  code: string;
  image: string;
  result: Result | null;
  record: Record | null;
}

interface Result {
  outcome: string | null;
  gameWins: number;
}

interface Record {
  wins: number;
  losses: number;
}

interface Strategy {
  type: string;
  count: number;
}
