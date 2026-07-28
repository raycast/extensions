import { getWebBaseUrl } from "./preferences";

/** Deep link to an expiration item's detail page in the web app. */
export function expirationWebUrl(id: string): string {
  return `${getWebBaseUrl()}/expirationitem/view/${id}`;
}

/** Deep link to a contact's detail page in the web app. */
export function contactWebUrl(id: string): string {
  return `${getWebBaseUrl()}/contact/view/${id}`;
}

/**
 * Web-app deep-link path segment per attachment `entity_type` (as returned by the
 * global attachment search, ENG-2642). Values match the backend's entity-type
 * strings and the web app's `/{segment}/view/{id}` route convention (verified
 * against GridAdaptorUtility / GlobalSearchView).
 */
const ENTITY_URL_SEGMENT: Record<string, string> = {
  expirationitem: "expirationitem",
  contact: "contact",
  location: "location",
  vehicle: "vehicle",
  equipment: "equipment",
  company: "company",
};

/**
 * Deep link to the related entity's detail page for an attachment search hit.
 * Returns undefined for an unknown/unmapped entity type so callers can hide the
 * "Open Related Item" action rather than build a broken URL.
 */
export function entityWebUrl(entityType: string | undefined, id: string | undefined): string | undefined {
  if (!entityType || !id) return undefined;
  const segment = ENTITY_URL_SEGMENT[entityType.toLowerCase()];
  return segment ? `${getWebBaseUrl()}/${segment}/view/${id}` : undefined;
}
