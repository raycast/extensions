import axios from "axios";
import { StandingsResponse } from "../types/standings.types";

type GetStandingsArgs = {
  league: string; // "nba" or "wnba"
  group: string; // "conference" or "league"
};

const getStandings = async ({ league, group }: GetStandingsArgs): Promise<StandingsResponse> => {
  const baseUrl = `https://site.web.api.espn.com/apis/v2/sports/basketball/${league}/standings`;

  const params = {
    region: "us",
    lang: "en",
    contentorigin: "espn",
    type: league === "nba" ? 1 : 0, // Type ID differs between leagues
    level: group === "league" ? 1 : 2, // Group ID for league vs conference
  };

  const res = await axios.get<StandingsResponse>(baseUrl, { params });

  if (!res.data || !res.data.children) {
    throw new Error(`Unexpected response structure for ${league.toUpperCase()} standings`);
  }

  return res.data;
};

export default getStandings;
