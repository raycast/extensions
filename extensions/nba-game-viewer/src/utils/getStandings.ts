import axios from "axios";

type GetStandingsArgs = {
  year: string;
  group: string;
};

const getStandings = async ({ year, group }: GetStandingsArgs) => {
  const groupId = group === "league" ? 1 : group === "conference" ? 2 : 3;
  const baseUrl = `https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings`;
  const params = {
    region: "us",
    lang: "en",
    contentorigin: "espn",
    season: year,
    type: 1,
    level: groupId,
  };
  const res = await axios.get(baseUrl, {
    params,
  });
  return res.data;
};

export default getStandings;
