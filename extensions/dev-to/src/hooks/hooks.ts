import { Article } from "../types/articles";
import { ReadingList } from "../types/readingList";
import { preference } from "../utils/functions";
import { useFetch } from "@raycast/utils";
import { DEFAULT_PER_PAGE } from "../config/constants";
import { ArticleById } from "../types/articleById";

const headers = {
  accept: "application/vnd.forem.api-v1+json",
  "api-key": preference.accessToken,
};

const usePaginated = <T>(endpoint: string) => {
  const { data, isLoading, pagination, revalidate } = useFetch(
    (options) =>
      "https://dev.to/api" +
      endpoint +
      "?" +
      new URLSearchParams({
        page: String(options.page + 1),
        per_page: String(DEFAULT_PER_PAGE),
      }).toString(),
    {
      method: "GET",
      headers,
      mapResult(result: T[]) {
        return {
          data: result,
          hasMore: result.length === DEFAULT_PER_PAGE,
        };
      },
      initialData: [],
    }
  );

  return { data, isLoading, pagination, revalidate };
};

export const getArticles = () => usePaginated<Article>("/articles/me/all");

export const getReadingList = () => usePaginated<ReadingList>("/readinglist");

export const getArticleMarkdown = (id: number) => {
  const { isLoading, data } = useFetch(`https://dev.to/api/articles/${id}`, {
    method: "GET",
    headers,
    mapResult(result: ArticleById) {
      return {
        data: result.body_markdown,
      };
    },
    initialData: "",
    execute: !!id,
  });
  return { isLoading, data };
};
