import axios from "axios";
import { StandingsResponse } from "../types/standings.types";

type GetStandingsArgs = {
  year: string;
  league: string;
  group: string;
};

const getStandings = async ({ year, league, group }: GetStandingsArgs): Promise<StandingsResponse> => {
  const typeId = league === "nba" ? 1 : 0;
  const groupId = group === "league" ? 1 : group === "conference" ? 2 : 3;
  const baseUrl = `https://site.web.api.espn.com/apis/v2/sports/basketball/${league}/standings`;
  const params = {
    region: "us",
    lang: "en",
    contentorigin: "espn",
    season: year,
    type: typeId,
    level: groupId,
  };
  const res = await axios.get(baseUrl, {
    params,
  });
  return res.data;
};

export default getStandings;
