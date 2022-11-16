import useSWR from "swr";
import got from "got";

interface WikipediaPageDataResponse {
  title: string;
  extract: string;
  description: string;
  thumbnail: {
    source: string;
  };
}

interface WikipediaFeaturedSearchResponse {
  tfa: {
    displaytitle: string;
  };
}

interface WikipediaSearchResponse {
  query: {
    prefixsearch: Array<{
      title: string;
    }>;
  };
}

const client = got.extend({
  prefixUrl: "https://en.wikipedia.org/",
  responseType: "json",
});

export async function getRandomPageTitle() {
  const response = await client.get("api/rest_v1/page/random/summary").json<WikipediaPageDataResponse>();
  return response.title;
}

export async function getTodayFeaturedPageTitle() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  const response = await client
    .get(`api/rest_v1/feed/featured/${year}/${month}/${day}`)
    .json<WikipediaFeaturedSearchResponse>();
  return response.tfa.displaytitle;
}

async function findPagesByTitle(search: string) {
  if (!search) {
    return [];
  }
  const response = await client
    .get("w/api.php", {
      searchParams: {
        action: "query",
        list: "prefixsearch",
        format: "json",
        pssearch: search,
        pslimit: 9,
      },
    })
    .json<WikipediaSearchResponse>();
  return response.query.prefixsearch.map((result) => result.title);
}

async function getPageData(title: string) {
  const response = await client.get(`api/rest_v1/page/summary/${title}`).json<WikipediaPageDataResponse>();
  return response;
}

export function encodeTitle(title: string) {
  const replacedSpaces = title.replaceAll(" ", "_");
  const withoutHTMLTags = replacedSpaces.replaceAll(/(<([^>]+)>)/gi, "");
  return encodeURIComponent(withoutHTMLTags);
}

export function useWikipediaSearch(search: string) {
  return useSWR(["pages", search], () => findPagesByTitle(search));
}

export function useWikipediaPageData(title?: string) {
  return useSWR(title ? ["page/summary", title] : null, () => {
    if (title) {
      return getPageData(title);
    }
  });
}
