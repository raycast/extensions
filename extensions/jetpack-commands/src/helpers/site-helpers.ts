import { SiteExcerptData } from "./site-types";

export function isCustomDomain(site: SiteExcerptData) {
  return !site?.slug?.endsWith(".wordpress.com") && !site?.slug?.endsWith(".wpcomstaging.com");
}

export function isNotAtomicJetpack(site: SiteExcerptData) {
  return site?.jetpack && !site?.is_wpcom_atomic;
}

export const isP2Site = (site: SiteExcerptData) => site.options?.is_wpforteams_site;
