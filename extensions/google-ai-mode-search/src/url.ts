const GOOGLE_SEARCH_URL = "https://www.google.com/search";

export function buildGoogleAiModeUrl(query?: string): string {
  const url = new URL(GOOGLE_SEARCH_URL);

  if (query) {
    url.searchParams.set("q", query);
  }

  url.searchParams.set("udm", "50");

  return url.toString();
}
