import axios from "axios";

type GetRosterArgs = {
  league: string;
  id: number;
};

const getRoster = async ({ league, id }: GetRosterArgs) => {
  if (!league || typeof league !== "string") {
    throw new Error("Invalid league specified.");
  }

  const baseUrl = `http://site.api.espn.com/apis/site/v2/sports/basketball/${league}/teams/${id}`;
  const params = {
    enable: "roster",
  };

  const res = await axios.get(baseUrl, { params });
  return res.data.team.athletes;
};

export default getRoster;
