import got from "got";
import wiki from "wikijs";

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

const getApiUrl = (language = "en") => `https://${language}.wikipedia.org/`;

export async function getRandomPageUrl(language: string) {
  const response = await got.get(`${getApiUrl(language)}api/rest_v1/page/random/summary`).json<PageSummary>();
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
  const response = await got
    .get(`${getApiUrl(language)}api/rest_v1/feed/featured/${year}/${month}/${day}`)
    .json<{ tfa: PageSummary }>();
  return {
    url: response.tfa.content_urls.desktop.page,
    title: response.tfa.title,
  };
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
  return got.get(`${getApiUrl(language)}api/rest_v1/page/summary/${encodeURIComponent(title)}`).json<PageSummary>();
}

export async function getPageContent(title: string, language: string): Promise<WikiNode[]> {
  return (
    wiki({
      apiUrl: `${getApiUrl(language)}w/api.php`,
    })
      .page(title)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((page) => page.content() as any as WikiNode[])
      .catch(() => [])
  );
}

export async function getPageMetadata(title: string, language: string): Promise<Record<string, any>> {
  return (
    wiki({
      apiUrl: `${getApiUrl(language)}w/api.php`,
    })
      .page(title)
      .then((page) => page.fullInfo())
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .then((page) => page?.general ?? {})
      .catch(() => ({}))
  );
}

export async function getPageLinks(title: string, language: string) {
  return wiki({
    apiUrl: `${getApiUrl(language)}w/api.php`,
  })
    .page(title)
    .then((page) => page.links())
    .catch(() => []);
}

export async function getAvailableLanguages(title: string, language: string) {
  return wiki({
    apiUrl: `${getApiUrl(language)}w/api.php`,
  })
    .page(title)
    .then((page) => page.langlinks())
    .then((items) => items.flatMap((item) => item.lang))
    .catch(() => [language]);
}
