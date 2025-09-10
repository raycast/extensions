/**
 * Add Raycast UTM parameters to a URL.
 * @param baseUrl - The base URL to add UTM parameters to.
 * @param campaign - The campaign name to use for the UTM parameters.
 * @returns The URL with UTM parameters added.
 */
export const addRaycastUTM = (baseUrl: string, campaign = "extension"): string => {
  const url = new URL(baseUrl);

  url.searchParams.set("utm_source", "raycast");
  url.searchParams.set("utm_medium", "sparkscan-raycast-extension");
  url.searchParams.set("utm_campaign", campaign);

  return url.toString();
};
