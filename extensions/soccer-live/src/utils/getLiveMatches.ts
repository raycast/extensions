import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { ALL_LEAGUES } from "./leagueConstants";

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
    detail?: string;
  };
  displayClock?: string;
}

interface Competition {
  competitors: Competitor[];
  status: Status;
  league: {
    abbreviation: string;
    name: string;
  };
}

export interface Game {
  id: string;
  name: string;
  date: string;
  competitions: Competition[];
  links: { href: string }[];
  leagueName?: string;
  leagueCode?: string;
}

interface Response {
  events: Game[];
}

export default function getLiveMatches() {
  // Fetch most popular leagues for live matches (expanded list)
  // Top European leagues + major competitions
  const popularLeagues = ALL_LEAGUES.filter(
    (league) =>
      league.code === "ENG.1" ||
      league.code === "ESP.1" ||
      league.code === "GER.1" ||
      league.code === "ITA.1" ||
      league.code === "FRA.1" ||
      league.code === "NED.1" ||
      league.code === "POR.1" ||
      league.code === "uefa.champions" ||
      league.code === "uefa.europa" ||
      league.code === "fifa.world" ||
      league.code === "uefa.euro",
  );

  // Fetch all popular leagues in parallel (hooks must be at top level)
  const eplData = useFetch<Response>("https://site.api.espn.com/apis/site/v2/sports/soccer/ENG.1/scoreboard?dates=");
  const laLigaData = useFetch<Response>("https://site.api.espn.com/apis/site/v2/sports/soccer/ESP.1/scoreboard?dates=");
  const bundesligaData = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/GER.1/scoreboard?dates=",
  );
  const serieAData = useFetch<Response>("https://site.api.espn.com/apis/site/v2/sports/soccer/ITA.1/scoreboard?dates=");
  const ligue1Data = useFetch<Response>("https://site.api.espn.com/apis/site/v2/sports/soccer/FRA.1/scoreboard?dates=");
  const eredivisieData = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/NED.1/scoreboard?dates=",
  );
  const primeiraLigaData = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/POR.1/scoreboard?dates=",
  );
  const championsData = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=",
  );
  const europaData = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard?dates=",
  );
  const worldCupData = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=",
  );
  const euroData = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.euro/scoreboard?dates=",
  );

  const allData = [
    { data: eplData, league: popularLeagues.find((l) => l.code === "ENG.1")! },
    { data: laLigaData, league: popularLeagues.find((l) => l.code === "ESP.1")! },
    { data: bundesligaData, league: popularLeagues.find((l) => l.code === "GER.1")! },
    { data: serieAData, league: popularLeagues.find((l) => l.code === "ITA.1")! },
    { data: ligue1Data, league: popularLeagues.find((l) => l.code === "FRA.1")! },
    { data: eredivisieData, league: popularLeagues.find((l) => l.code === "NED.1")! },
    { data: primeiraLigaData, league: popularLeagues.find((l) => l.code === "POR.1")! },
    { data: championsData, league: popularLeagues.find((l) => l.code === "uefa.champions")! },
    { data: europaData, league: popularLeagues.find((l) => l.code === "uefa.europa")! },
    { data: worldCupData, league: popularLeagues.find((l) => l.code === "fifa.world")! },
    { data: euroData, league: popularLeagues.find((l) => l.code === "uefa.euro")! },
  ];

  const { allMatches, isLoading } = useMemo(() => {
    const matches: Array<Game & { leagueName: string; leagueCode: string }> = [];
    let loading = false;

    allData.forEach(({ data, league }) => {
      if (data.isLoading) loading = true;

      if (data.data?.events) {
        data.data.events.forEach((event) => {
          // Only include live/running matches (state === "in")
          if (event.competitions?.[0]?.status?.type?.state === "in") {
            matches.push({
              ...event,
              leagueName: league.name,
              leagueCode: league.code,
            });
          }
        });
      }
    });

    return { allMatches: matches, isLoading: loading };
  }, [
    eplData.data,
    eplData.isLoading,
    laLigaData.data,
    laLigaData.isLoading,
    bundesligaData.data,
    bundesligaData.isLoading,
    serieAData.data,
    serieAData.isLoading,
    ligue1Data.data,
    ligue1Data.isLoading,
    eredivisieData.data,
    eredivisieData.isLoading,
    primeiraLigaData.data,
    primeiraLigaData.isLoading,
    championsData.data,
    championsData.isLoading,
    europaData.data,
    europaData.isLoading,
    worldCupData.data,
    worldCupData.isLoading,
    euroData.data,
    euroData.isLoading,
  ]);

  return { allMatches, isLoading };
}
