/**
 * Encodes a value for use in ref.ly URLs.
 * Replaces %20 with + for cleaner URLs.
 */
export function encodeForRefLy(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, "+");
}
