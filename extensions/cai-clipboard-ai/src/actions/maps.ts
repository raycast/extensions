import { open, getPreferenceValues } from "@raycast/api";

/**
 * Open location in maps
 */
export async function openInMaps(location: string): Promise<void> {
  const { preferredMaps } = getPreferenceValues<Preferences>();
  const encodedLocation = encodeURIComponent(location);

  if (preferredMaps === "google") {
    await open(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`);
  } else {
    // Apple Maps
    await open(`http://maps.apple.com/?q=${encodedLocation}`);
  }
}
