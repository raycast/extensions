import { ParseResult } from "../types";

export function parseUrl(url: string): ParseResult | undefined {
  const trimmed = (url || "").trim();
  if (!trimmed) return undefined;
  try {
    const { href, protocol, hostname, port, origin, hash, pathname: path, searchParams: queries } = new URL(trimmed);
    return {
      href,
      protocol: protocol.replace(/:$/, ""),
      hostname,
      port,
      origin,
      hash: hash.replace(/^#/, ""),
      path: decodeURIComponent(path),
      query: Object.fromEntries(queries),
    };
  } catch (e) {
    console.error("error", e, url);
    return undefined;
  }
}

export function buildUrl({ protocol, hostname, port, path, query, hash }: ParseResult) {
  const urlParts = [
    protocol ? protocol.replace(/:$/, "") + "://" : "",
    hostname || "",
    port ? `:${port}` : "",
    path ? encodeURI(path) : "/",
  ];
  const queryStr = Object.entries(query || {})
    .filter(([k]) => k)
    .map(([k, v]) => {
      if (!v) return "";
      return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    })
    .filter(Boolean)
    .join("&");
  if (queryStr) {
    urlParts.push("?" + queryStr);
  }
  if (hash) {
    urlParts.push("#" + hash.replace(/^#/, ""));
  }
  return urlParts.join("");
}

export function getItemId(item: ParseResult) {
  return item.href + "#$#" + item.alias;
}

export function getItemIdFromId(id: string) {
  const [href, alias] = id.split("#$#");
  return { href, alias };
}

export function isURLLike(url: string) {
  try {
    new URL(url.trim());
    return true;
  } catch {
    return false;
  }
}
