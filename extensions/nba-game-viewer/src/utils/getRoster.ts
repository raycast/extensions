import axios from "axios";

type GetRosterArgs = {
  league: string;
  id: number;
};

const getRoster = async ({ league, id: id }: GetRosterArgs) => {
  const baseUrl = `http://site.api.espn.com/apis/site/v2/sports/basketball/${league}/teams/${id}`;
  const params = {
    enable: "roster",
  };
  const res = await axios.get(baseUrl, {
    params,
  });
  return res.data.team.athletes;
};

export default getRoster;
