import { useEffect } from "react";

import { apiRequest, handleApiResponse } from "@/utils";

type RequestParams = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  params?: Record<string, unknown>;
};

const CONFIG: RequestParams = {
  method: "GET",
  url: "/rest/api/2/issuetype",
} as const;

export function useApiTest() {
  useEffect(() => {
    fetchApi();
  }, []);
}

async function fetchApi() {
  const { url, method, params } = CONFIG;

  if (!url) return;

  try {
    const data = await apiRequest({ method, url, params });
    handleApiResponse({ data, fileName: "test", defaultValue: null });
  } catch (err) {
    console.error("🚀 ~ fetchApi ~ err:", err);
  }
}
