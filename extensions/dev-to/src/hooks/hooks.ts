import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { RootObject } from "../types/articles";
import fetch, { Headers } from "node-fetch";
import { preference } from "../utils/utils";

//for refresh useState
export const refreshNumber = () => {
  return new Date().getTime();
};

export const getArticles = (endpoint = "") => {
  const [articles, setArticles] = useState<RootObject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = new Headers({
        "api-key": preference.accessToken,
      });

      const response = await fetch("https://dev.to/api/articles/me" + endpoint, {
        method: "GET",
        headers: headers,
      });

      if (response.ok) {
        const result = (await response.json()) as RootObject[];
        console.log(result);
        setArticles(result);
      }
    } catch (e) {
      await showToast(Toast.Style.Failure, String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { articles: articles, loading: loading };
};
