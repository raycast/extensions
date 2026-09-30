import { useFetch } from "@raycast/utils";
import sportInfo from "./getSportInfo";

interface Article {
  id: string;
  headline: string;
  published: string;
  byline?: string;
  description?: string;
  type: string;
  images: { url: string }[];
  links: { web: { href: string } };
}

interface ArticlesResponse {
  articles: Article[];
}

export default function getArticles() {
  const currentLeague = sportInfo.getLeague();
  const currentSport = sportInfo.getSport();

  const {
    isLoading: articleLoading,
    data: articleData,
    revalidate: articleRevalidate,
  } = useFetch<ArticlesResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/${currentSport}/${currentLeague}/news?limit=50`,
  );

  return { articleData, articleLoading, articleRevalidate };
}
