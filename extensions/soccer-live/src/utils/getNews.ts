import { useFetch } from "@raycast/utils";

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

export default function getNews(leagueCode: string) {
  const {
    isLoading: articleLoading,
    data: articleData,
    revalidate: articleRevalidate,
  } = useFetch<ArticlesResponse>(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/news?limit=50`);

  return { articleData, articleLoading, articleRevalidate };
}
