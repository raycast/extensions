import { RAILS_API_BASE_URL } from "../base_url";

export function buildUrlWith(path: string, anchor?: string) {
  let url = `${RAILS_API_BASE_URL}/${path}`;
  if (anchor) url += `#${anchor}`;
  return url;
}

export function replaceUrl(originalPath: string, path: string) {
  let deepLinkCount = 0;
  let deconstructedPath;
  if (path.includes("../")) {
    deconstructedPath = path.split("../");
    deepLinkCount = deconstructedPath.length;
  }
  let rebuildUrl;
  if (deepLinkCount === 0) {
    const currentUrl = buildUrlWithoutAnchor(originalPath);
    const parentUrl = currentUrl.split("/").slice(0, -1).join("/");
    rebuildUrl = `${parentUrl}/${path}`;
  } else {
    const currentUrl = buildUrlWithoutAnchor(originalPath);
    const parentUrl = currentUrl
      .split("/")
      .slice(0, deepLinkCount * -1)
      .join("/");
    rebuildUrl = `${parentUrl}/${deconstructedPath?.at(-1)}`;
  }
  return rebuildUrl;
}

export function buildUrlWithoutAnchor(path: string) {
  const argWithoutAnchor = path.split("#")[0];
  return `${RAILS_API_BASE_URL}/${argWithoutAnchor}`;
}

export function hasAnchor(path: string) {
  return path.includes("#");
}

export function extractAnchor(path: string) {
  return path.split("#")[1];
}
