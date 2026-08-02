const GOOGLE_SEARCH_URL = "https://www.google.com/search";

export function buildGoogleAiModeUrl(query?: string): string {
  if (!query) {
    return `${GOOGLE_SEARCH_URL}?udm=50`;
  }

  return `${GOOGLE_SEARCH_URL}?q=${encodeURIComponent(query)}&udm=50`;
}
