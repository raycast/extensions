import { environment } from "@raycast/api";
import fetch from "node-fetch";

export interface PageSummary {
  title: string;
  extract: string;
  description: string;
  thumbnail: {
    source: string;
  };
  content_urls: {
    desktop: {
      page: string;
    };
  };
}

export interface WikiNode {
  title: string;
  content: string;
  items?: WikiNode[];
}

export const getApiUrl = (language = "en") => {
  return `https://${language.split("-").at(0)}.wikipedia.org/`;
};

export const getApiOptions = (language = "en") => {
  const variant = language.split("-").at(1);
  const userAgent = { "User-Agent": `Raycast/${environment.raycastVersion} (https://raycast.com)` };
  if (variant) {
    return { headers: { "Accept-Language": language, ...userAgent } };
  }
  return { headers: userAgent };
};

export async function getRandomPageUrl(language: string) {
  const response = await fetch(`${getApiUrl(language)}api/rest_v1/page/random/summary`, getApiOptions(language)).then(
    (res) => res.json() as Promise<PageSummary>,
  );
  return {
    url: response.content_urls.desktop.page,
    title: response.title,
  };
}

export async function getTodayFeaturedPageUrl(language: string) {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  const response = await fetch(
    `${getApiUrl(language)}api/rest_v1/feed/featured/${year}/${month}/${day}`,
    getApiOptions(language),
  ).then((res) => res.json() as Promise<{ tfa: PageSummary }>);
  return {
    url: response.tfa.content_urls.desktop.page,
    title: response.tfa.title,
  };
}

export async function getPageData(title: string, language: string) {
  return fetch(
    `${getApiUrl(language)}api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    getApiOptions(language),
  ).then((res) => res.json() as Promise<PageSummary>);
}
