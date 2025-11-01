import { createUrlFetcher, createUrlWindowLessFetcher } from "@/api/fetcher";

export * as requests from "./requests";

export const createFetcher = () => createUrlFetcher("https://dash.deno.com/api");
export const createWindowLessFetcher = () => createUrlWindowLessFetcher("https://dash.deno.com/api");
