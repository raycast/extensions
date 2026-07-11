import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

const MAX_REDIRECTS = 5;

export async function safeFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  let currentUrl = new URL(input);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    await assertPublicHttpUrl(currentUrl);
    const response = await fetch(currentUrl, { ...init, redirect: "manual" });

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location)
      throw new Error("The server returned a redirect without a destination.");
    if (redirects === MAX_REDIRECTS)
      throw new Error("The request exceeded the redirect limit.");
    currentUrl = new URL(location, currentUrl);
  }

  throw new Error("The request exceeded the redirect limit.");
}

export async function assertPublicHttpUrl(input: string | URL): Promise<URL> {
  const url = typeof input === "string" ? new URL(input) : input;
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Local and private-network URLs are not allowed.");
  }

  const addresses = ipaddr.isValid(hostname)
    ? [hostname]
    : (await lookup(hostname, { all: true, verbatim: true })).map(
        ({ address }) => address,
      );

  if (
    addresses.length === 0 ||
    addresses.some((address) => !isPublicAddress(address))
  ) {
    throw new Error("Local and private-network URLs are not allowed.");
  }

  return url;
}

function isPublicAddress(value: string): boolean {
  const address = ipaddr.process(value);
  return address.range() === "unicast";
}
