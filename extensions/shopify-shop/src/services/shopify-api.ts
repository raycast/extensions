import { DEFAULT_STORE } from "../constants/config";

function stripProductsPath(path: string) {
  return path.replace(/\/products(\.json)?\/?$/i, "");
}

function parseHttpUrl(url: string): { protocol: string; host: string; pathname: string } | null {
  const match = url.match(/^(https?):\/\/([^/?#]+)(\/[^?#]*)?/i);
  if (!match) return null;
  return {
    protocol: `${match[1].toLowerCase()}:`,
    host: match[2],
    pathname: match[3] ?? "/",
  };
}

export function buildProductJsonUrl(base?: string | null, handle?: string) {
  return `${buildStoreOrigin(base)}/products/${handle ?? ""}.json`;
}

export function buildProductPageUrl(base?: string | null, handle?: string) {
  return `${buildStoreOrigin(base)}/products/${handle ?? ""}`;
}

export function buildStoreOrigin(base?: string | null) {
  if (!base || base.length === 0) return DEFAULT_STORE;
  const b = base.trim();

  const maybe = parseHttpUrl(b);
  if (maybe) {
    const stripped = stripProductsPath(maybe.pathname);
    const origin = `${maybe.protocol}//${maybe.host}${stripped && stripped !== "/" ? stripped : ""}`;
    return origin.replace(/\/$/, "");
  } else {
    const b2 = stripProductsPath(b).replace(/\/$/, "");
    if (b2.length === 0) return DEFAULT_STORE;
    // If this looks like a hostname without a scheme, assume https://
    if (/\./.test(b2) && !/^https?:\/\//i.test(b2)) {
      return `https://${b2}`;
    }
    return b2;
  }
}

export function buildProductJsUrl(base?: string | null, handle?: string) {
  return `${buildStoreOrigin(base)}/products/${handle ?? ""}.js`;
}

export function buildRecommendationsUrl(base?: string | null, productId?: number | string | null, currency?: string) {
  const id = typeof productId === "number" || (typeof productId === "string" && productId.length > 0) ? productId : "";
  const origin = buildStoreOrigin(base);
  const curr = encodeURIComponent(currency || "USD");
  return `${origin}/recommendations/products.json?product_id=${encodeURIComponent(String(id))}&currency=${curr}`;
}

export function buildSearchSuggestUrl(
  base?: string | null,
  query?: string,
  currency?: string,
  resourceTypes: string[] = ["product"],
) {
  const q = query ?? "";
  const origin = buildStoreOrigin(base);
  const curr = encodeURIComponent(currency || "USD");
  const typeParam = encodeURIComponent(resourceTypes.join(","));
  return `${origin}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=${typeParam}&currency=${curr}`;
}
