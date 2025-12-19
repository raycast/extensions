import { DEFAULT_STORE } from "../constants/config";

function stripProductsPath(path: string) {
  return path.replace(/\/products(\.json)?\/?$/i, "");
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function buildProductJsonUrl(base?: string | null, handle?: string) {
  const h = handle ?? "";
  if (!base || base.length === 0) return `${DEFAULT_STORE}/products/${h}.json`;
  const b = base.trim();

  if (isValidUrl(b)) {
    const maybe = new URL(b);
    if (/\/products\/.+\.json$/i.test(maybe.pathname)) {
      return `${maybe.origin}/products/${h}.json`;
    }
    const stripped = stripProductsPath(maybe.pathname);
    const origin = `${maybe.protocol}//${maybe.host}${stripped && stripped !== "/" ? stripped : ""}`;
    return `${origin.replace(/\/$/, "")}/products/${h}.json`;
  } else {
    const b2 = stripProductsPath(b).replace(/\/$/, "");
    if (b2.length === 0) return `${DEFAULT_STORE}/products/${h}.json`;
    // If the provided base looks like a hostname (e.g. "myshop.myshopify.com"),
    // ensure we include the https:// scheme so fetch requests are absolute URLs.
    if (/\./.test(b2) && !/^https?:\/\//i.test(b2)) {
      return `https://${b2.replace(/\/$/, "")}/products/${h}.json`;
    }
    return `${b2.replace(/\/$/, "")}/products/${h}.json`;
  }
}

export function buildProductPageUrl(base?: string | null, handle?: string) {
  const h = handle ?? "";
  if (!base || base.length === 0) return `${DEFAULT_STORE}/products/${h}`;
  const b = base.trim();

  if (isValidUrl(b)) {
    const maybe = new URL(b);
    const stripped = stripProductsPath(maybe.pathname);
    const origin = `${maybe.protocol}//${maybe.host}${stripped && stripped !== "/" ? stripped : ""}`;
    return `${origin.replace(/\/$/, "")}/products/${h}`;
  } else {
    const b2 = stripProductsPath(b).replace(/\/$/, "");
    if (b2.length === 0) return `${DEFAULT_STORE}/products/${h}`;
    if (/\./.test(b2) && !/^https?:\/\//i.test(b2)) {
      return `https://${b2.replace(/\/$/, "")}/products/${h}`;
    }
    return `${b2.replace(/\/$/, "")}/products/${h}`;
  }
}

export function buildStoreOrigin(base?: string | null) {
  if (!base || base.length === 0) return DEFAULT_STORE;
  const b = base.trim();

  if (isValidUrl(b)) {
    const maybe = new URL(b);
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
  const h = handle ?? "";
  if (!base || base.length === 0) return `${DEFAULT_STORE}/products/${h}.js`;
  const b = base.trim();

  if (isValidUrl(b)) {
    const maybe = new URL(b);
    const stripped = stripProductsPath(maybe.pathname);
    const origin = `${maybe.protocol}//${maybe.host}${stripped && stripped !== "/" ? stripped : ""}`;
    return `${origin.replace(/\/$/, "")}/products/${h}.js`;
  } else {
    const b2 = stripProductsPath(b).replace(/\/$/, "");
    if (b2.length === 0) return `${DEFAULT_STORE}/products/${h}.js`;
    if (/\./.test(b2) && !/^https?:\/\//i.test(b2)) {
      return `https://${b2.replace(/\/$/, "")}/products/${h}.js`;
    }
    return `${b2.replace(/\/$/, "")}/products/${h}.js`;
  }
}

export function buildRecommendationsUrl(base?: string | null, productId?: number | string | null, currency?: string) {
  const id = typeof productId === "number" || (typeof productId === "string" && productId.length > 0) ? productId : "";
  const origin = buildStoreOrigin(base);
  const curr = encodeURIComponent(currency || "USD");
  return `${origin}/recommendations/products.json?product_id=${encodeURIComponent(String(id))}&currency=${curr}`;
}

export function buildSearchSuggestUrl(base?: string | null, query?: string, currency?: string) {
  const q = query ?? "";
  const origin = buildStoreOrigin(base);
  const curr = encodeURIComponent(currency || "USD");
  return `${origin}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&currency=${curr}`;
}
