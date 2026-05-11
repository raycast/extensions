import { createUrlFetcher, createUrlWindowLessFetcher } from "@/api/fetcher";

export const createFetcher = () => createUrlFetcher("https://api.deno.com/v1");
export const createWindowLessFetcher = () => createUrlWindowLessFetcher("https://api.deno.com/v1");
