import { isIP } from "node:net";

/** Accept public domains or HTTP(S) URLs; discard URL paths, queries, and ports. */
export function parseDomain(input: string): string | undefined {
  const value = input.trim();
  if (!value || /\s/.test(value)) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    // An incomplete search is expected while typing, not an operational error.
    return undefined;
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    return undefined;
  }
  const domain = url.hostname.toLowerCase().replace(/\.$/, "");
  const labels = domain.split(".");
  if (
    domain.length > 253 ||
    isIP(domain) ||
    labels.length < 2 ||
    labels.some(
      (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    ) ||
    !/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/.test(labels.at(-1)!) ||
    ["localhost", "local", "internal", "test", "invalid", "example"].includes(
      labels.at(-1)!,
    )
  ) {
    return undefined;
  }
  return domain;
}

/** Google may return a smaller favicon or a generic icon when no logo is available. */
export function getLogoURL(domain: string): string {
  const url = new URL("https://www.google.com/s2/favicons");
  url.searchParams.set("domain", domain);
  url.searchParams.set("sz", "256");
  return url.toString();
}
