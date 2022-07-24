import { config } from "./config";

/**
 * Returns the URL for the Apple Search API.
 *
 * @param uri
 */
export const makeUrl = (uri: string) => {
  if (uri.startsWith("/")) {
    return `${config.rootUrl}${uri}`;
  }

  return uri;
};

/**
 * Returns the URL in Markdown format.
 *
 * @param url
 * @param title
 */
export const makeUrlMarkdown = (url: string, title?: string) => `[${title ?? url}](${url})`;
