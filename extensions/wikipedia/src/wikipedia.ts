import useSWR from "swr";
import got from "got";

interface WikipediaPageExtractResponse {
  title: string;
  extract: string;
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
  const response = await client.get("api/rest_v1/page/random/summary").json<WikipediaPageExtractResponse>();
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

async function getPageExtract(title: string) {
  const response = await client.get(`api/rest_v1/page/summary/${title}`).json<WikipediaPageExtractResponse>();
  return response.extract;
}

export function useWikipediaSearch(search: string) {
  return useSWR(["pages", search], () => findPagesByTitle(search));
}

export function useWikipediaPageSummary(title?: string) {
  return useSWR(title ? ["page/summary", title] : null, () => {
    if (title) {
      return getPageExtract(title);
    }
  });
}
