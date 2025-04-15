// detect all urls in text
function findURLs(text: string): string[] {
  const regex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(regex);
  return matches ?? [];
}

// replace all urls in text
function replaceURLs(text: string, newURLs: string[]): string {
  const urls = findURLs(text);
  for (const url of urls) {
    text = text.replace(url, newURLs.shift() || url);
  }
  return text;
}

// remove some query params from url
function removeQueryParams(url: string, allowParams: string[]): string {
  // find all query params
  const urlParts = url.split("?");
  if (urlParts.length < 2) {
    return url;
  }
  const query = urlParts[1].split("&");

  // if params is not empty, match params to remove
  if (allowParams.length > 0) {
    const newQuery = query.filter((param) => allowParams.includes(param.split("=")[0]));
    return `${urlParts[0]}?${newQuery.join("&")}`;
  }
  // if params is empty, remove all query params
  return urlParts[0];
}

export { findURLs, removeQueryParams, replaceURLs };
