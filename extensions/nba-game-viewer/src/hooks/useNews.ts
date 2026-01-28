import { useCachedPromise } from "@raycast/utils";
import getNews from "../utils/getNews";
import type { Article, Category } from "../types/news.types";

const fetchNews = async (league: string) => {
  const newsData = await getNews({ league });
  const articles: Article[] = newsData.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (article: any): Article => ({
      title: article.headline,
      description: article.description,
      url: article.links.web.href,
      imageURL: article.images[0].url,
      imageCaption: article.images[0].caption,
      publishedAt: article.published,
      categories: article.categories.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (category: any): Category => ({
          id: category.id,
          name: category.description,
          type: category.type,
        }),
      ),
    }),
  );
  return articles;
};

const useNews = (league: string) =>
  useCachedPromise(fetchNews, [league], { failureToastOptions: { title: "Could not fetch news" } });

export default useNews;
