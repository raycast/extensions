import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Article } from "../types/articles";
import { ReadingList } from "../types/readingList";
import fetch, { Headers } from "node-fetch";
import { preference } from "../utils/functions";
import { useFetch } from "@raycast/utils";
import { DEFAULT_PER_PAGE } from "../config/constants";

export const refreshNumber = () => {
  return new Date().getTime();
};

export const getArticles = (endpoint: string) => {
  const { data, isLoading, pagination } = useFetch((options) => "https://dev.to/api" + endpoint + "?" + new URLSearchParams({
    page: String(options.page+1),
    per_page: String(DEFAULT_PER_PAGE)
  }).toString(), {
    method: "GET",
    headers: {
      accept: "application/vnd.forem.api-v1+json",
      "api-key": preference.accessToken,
    },
    mapResult(result: Article[]) {
      return {
        data: result,
        hasMore: result.length===DEFAULT_PER_PAGE
      }
    },
    initialData: []
  })
  
  return { data, isLoading, pagination };
};

export const getReadingList = (endpoint: string) => {
  const [readingList, setReadingList] = useState<ReadingList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = new Headers({
        accept: "application/vnd.forem.api-v1+json",
        "api-key": preference.accessToken,
      });

      const response = await fetch("https://dev.to/api" + endpoint, {
        method: "GET",
        headers: headers,
      });

      if (response.ok) {
        const result = (await response.json()) as ReadingList[];
        console.log(result);
        setReadingList(result);
      }
    } catch (e) {
      await showToast(Toast.Style.Failure, String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { readingList: readingList, loading: loading };
};
