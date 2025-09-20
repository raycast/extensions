import { config } from "./config";
import { Icon, Image } from "@raycast/api";
import ImageLike = Image.ImageLike;

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

export const getIcon = (type: string): ImageLike => {
  switch (type.toLowerCase()) {
    case "general":
      return Icon.Megaphone;
    case "sample_code":
      return Icon.CodeBlock;
    case "video":
      return Icon.PlayFilled;
    case "all":
      return "all-result-type.png";
    default:
      return Icon.Book;
  }
};

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const capitalizeRecursively = (s: string) => s.split(" ").map(capitalize).join(" ");

export const equals = (a: ResultLike, b: ResultLike) => {
  return a.title === b.title && a.url === b.url;
};
