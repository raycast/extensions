export type APISource = "universalinboxextension" | string;

export interface WebPage {
  url: string;
  title: string;
  timestamp: string;
  source: APISource;
  favicon?: string;
}

export function getWebPageHtmlUrl(webPage: WebPage): string {
  return webPage.url;
}
