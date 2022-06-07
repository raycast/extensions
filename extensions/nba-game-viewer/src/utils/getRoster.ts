import axios from "axios";

type GetRosterArgs = {
  id: number;
};

const getRoster = async ({ id: id }: GetRosterArgs) => {
  const baseUrl = `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}`;
  const params = {
    enable: "roster",
  };
  const res = await axios.get(baseUrl, {
    params,
  });
  return res.data.team.athletes;
};

export default getRoster;
