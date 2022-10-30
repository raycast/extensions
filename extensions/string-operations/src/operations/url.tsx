import { URL } from "url";
import { prettify } from "./json";

export function percentDecode(text: string): string {
  return decodeURIComponent(text);
}

export function percentEncode(text: string): string {
  return encodeURIComponent(text);
}

export function parseUrl(text: string): string {
  function parseQuery(queryString: string) {
    const query: { [key: string]: string } = {};
    const pairs = (queryString[0] === "?" ? queryString.substr(1) : queryString).split("&");
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i].split("=");
      query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
    }
    return query;
  }

  const url = new URL(text);
  return percentDecode(
    prettify(
      JSON.stringify({
        origin: url.origin,
        path: url.pathname,
        query: parseQuery(url.search),
      })
    )
  );
}
