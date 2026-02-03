import { useFetch } from "@raycast/utils";

interface Competitor {
  team: {
    abbreviation: string;
    displayName: string;
    logo: string;
    id: string;
  };
  score: string;
}

interface Status {
  type: {
    state: string;
    completed?: boolean;
    detail?: string;
  };
  displayClock?: string;
}

interface Venue {
  fullName: string;
  address?: {
    city: string;
    state?: string;
    country: string;
  };
}

interface Competition {
  competitors: Competitor[];
  status: Status;
  venue?: Venue;
}

export interface ScheduleGame {
  id: string;
  name: string;
  date: string;
  competitions: Competition[];
  links: { href: string }[];
  leagueName?: string;
  leagueCode?: string;
}

interface Response {
  events: ScheduleGame[];
}

export default function getSchedule(leagueCode: string) {
  const {
    isLoading: scheduleLoading,
    data: scheduleData,
    revalidate: scheduleRevalidate,
    error: scheduleError,
  } = useFetch<Response>(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/scoreboard?dates=`, {
    onError: () => {
      // Silently handle errors - return empty data instead of crashing
    },
    keepPreviousData: true,
  });

  // Return empty data if there's an error
  const safeData = scheduleError ? { events: [] } : scheduleData;

  return { scheduleData: safeData, scheduleLoading, scheduleRevalidate };
}
