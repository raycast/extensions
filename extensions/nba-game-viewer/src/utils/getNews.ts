import axios from "axios";

const getNews = async () => {
  const baseUrl = "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/news";

  const res = await axios.get(baseUrl);

  return res.data.articles;
};

export default getNews;
