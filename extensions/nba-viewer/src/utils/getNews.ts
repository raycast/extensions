import axios from "axios";

type GetNewsArgs = {
  league: string;
};

const getNews = async ({ league }: GetNewsArgs) => {
  const baseUrl = `http://site.api.espn.com/apis/site/v2/sports/basketball/${league}/news`;

  const res = await axios.get(baseUrl);

  return res.data.articles;
};

export default getNews;
