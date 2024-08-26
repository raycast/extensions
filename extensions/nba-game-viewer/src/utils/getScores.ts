import axios from "axios";

type GetScoresArgs = {
  league: string;
};

const getScores = async ({ league }: GetScoresArgs) => {
  const baseUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/scoreboard`;

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const formatDate = (date: Date) => date.toISOString().split("T")[0].replace(/-/g, "");

  const startDate = formatDate(sevenDaysAgo);
  const endDate = formatDate(today);

  const params = {
    region: "us",
    lang: "en",
    contentorigin: "espn",
    dates: `${startDate}-${endDate}`,
  };

  const res = await axios.get(baseUrl, { params });
  return res.data.events;
};

export default getScores;
