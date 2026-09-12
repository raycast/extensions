import { cookiesSchema, ParsedCookie } from "~/types";
import { createRaycastFileAdapter } from "~/lib/adapters";
import { persistentAtom } from "zod-persist";

export const $cookies = persistentAtom(
  {},
  {
    storage: createRaycastFileAdapter("cookies.json"),
    key: "cookies",
    schema: cookiesSchema,
  },
);

/**
 * An action to add a parsed cookie to the store.
 */
export function addParsedCookie(cookie: ParsedCookie) {
  const allCookies = $cookies.get();
  const domain = cookie.options.domain;

  if (!domain) return; // Cannot save a cookie without a domain

  const domainCookies = allCookies[domain] ?? [];

  // Remove any existing cookie with the same name before adding the new one
  const newDomainCookies = domainCookies.filter((c) => c.cookieName !== cookie.cookieName);
  newDomainCookies.push(cookie);

  const newState = { ...allCookies, [domain]: newDomainCookies };

  cookiesSchema.parse(newState);

  $cookies.set(newState);
}
