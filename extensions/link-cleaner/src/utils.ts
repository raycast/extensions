export function removeQueryParams(url: string, allowParams: string[]): string {
  const urlParts = url.split("?");
  if (urlParts.length < 2) {
    return url;
  }
  const query = urlParts[1].split("&");

  if (allowParams.length > 0) {
    const newQuery = query.filter((param) => allowParams.includes(param.split("=")[0]));
    return `${urlParts[0]}?${newQuery.join("&")}`;
  }
  return urlParts[0];
}
