import { useFetch } from "@raycast/utils";

interface Article {
  headline: string;
  published: string;
  story: string;
  byline?: string;
  description?: string;
  type: string;
  images: { url: string }[];
  links: { web: { href: string } };
}

interface ArticlesResponse {
  headlines: Article[];
}

export default function getArticleDetail({ articleId }: { articleId: string }) {
  const {
    isLoading: articleDetailLoading,
    data: articleDetailData,
    revalidate: articleDetailRevalidate,
  } = useFetch<ArticlesResponse>(`https://content.core.api.espn.com/v1/sports/news/${articleId}`);

  return { articleDetailData, articleDetailLoading, articleDetailRevalidate };
}
