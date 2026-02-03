import { useFetch } from "@raycast/utils";

interface Stats {
  name: string;
  displayValue: string;
  summary: string;
}

interface Team {
  displayName: string;
  id: string;
  logos: { href: string }[];
  links: { href: string }[];
}

interface StandingsEntry {
  team: Team;
  stats: Stats[];
}

interface StandingsData {
  links: [{ href: string }];
  children: [
    {
      name: string;
      standings: {
        entries: StandingsEntry[];
      };
    },
    {
      name: string;
      standings: {
        entries: StandingsEntry[];
      };
    },
  ];
}

export default function getStandings(leagueCode: string) {
  const {
    isLoading: standingsLoading,
    data: standingsData,
    revalidate: standingsRevalidate,
  } = useFetch<StandingsData>(
    `https://site.web.api.espn.com/apis/v2/sports/soccer/${leagueCode}/standings?&sort=playoffseed:asc,points:desc,gamesplayed:asc`,
  );

  return { standingsData, standingsLoading, standingsRevalidate };
}
