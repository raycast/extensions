import fetch, { RequestInit } from "node-fetch";
import { getAuthToken } from "./helpers";

type Method = "GET" | "POST" | "PUT" | "DELETE";

type RequestOptions = Partial<{
  method: Method;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: RequestInit["body"];
}>;

export async function request<T>(path: string, options: RequestOptions = { method: "GET" }) {
  const token = getAuthToken();

  const { headers, params, ...rest } = options;
  const defaultHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const mergedHeaders = { ...defaultHeaders, ...headers };
  const query = params ? `?${new URLSearchParams(params)}` : "";

  const response = await fetch(`https://vapor.laravel.com/api/${path}${query}`, {
    headers: mergedHeaders,
    ...rest,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }

  // check if we are unauthorized and redirect to login
  if (response.url === "https://vapor.laravel.com/login") {
    throw new Error("Unauthorized, please check your token");
  }

  // IDK only seeing this when using the PUT method to switch teams
  if (response.headers.get("content-type")?.includes("text/html")) {
    return response.text() as unknown as T;
  }

  return (await response.json()) as T;
}
