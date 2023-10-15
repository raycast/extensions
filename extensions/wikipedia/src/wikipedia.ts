import got from "got";

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

const getApiUrl = (language = "en") => `https://${language}.wikipedia.org/`;

export async function getRandomPageUrl() {
  const response = await got.get(`${getApiUrl()}api/rest_v1/page/random/summary`).json<PageSummary>();
  return response.content_urls.desktop.page;
}

export async function getTodayFeaturedPageUrl() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  const response = await got
    .get(`${getApiUrl()}api/rest_v1/feed/featured/${year}/${month}/${day}`)
    .json<{ tfa: PageSummary }>();
  return response.tfa.content_urls.desktop.page;
}

export async function findPagesByTitle(search: string, language: string) {
  if (!search) {
    return { language, results: [] };
  }
  const response = await got
    .get(`${getApiUrl(language)}w/api.php`, {
      searchParams: {
        action: "query",
        list: "prefixsearch",
        format: "json",
        pssearch: search,
        pslimit: 9,
      },
    })
    .json<{ query: { prefixsearch: { title: string }[] } }>();
  return { language, results: response.query.prefixsearch.map((result) => result.title) };
}

export async function getPageData(title: string, language: string) {
  const response = await got
    .get(`${getApiUrl(language)}api/rest_v1/page/summary/${encodeURIComponent(title)}`)
    .json<PageSummary>();
  return response;
}
