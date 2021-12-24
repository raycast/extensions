import { URL } from "url";

export const createBookmarkListItem = (url: string, name?: string) => {
  const urlOrigin = new URL(url).origin;
  const urlToDisplay = url.replace(/(^\w+:|^)\/\//, "");
  return {
    url: url,
    title: name ? name : urlToDisplay,
    subtitle: name ? urlToDisplay : undefined,
    iconURL: `${urlOrigin}/favicon.ico`,
  };
};
