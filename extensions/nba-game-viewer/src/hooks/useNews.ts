import getNews from "../utils/getNews";
import { useCallback } from "react";
import type { Article, Category } from "../types/news.types";
import { useCachedPromise } from "@raycast/utils";

const useNews = () => {
  const fetchNews = useCallback(async () => {
    const data = await getNews();

    const articles: Article[] = data.map(
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
          })
        ),
      })
    );

    return articles;
  }, []);

  return useCachedPromise(fetchNews);
};

export default useNews;
