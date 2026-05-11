/**
 * @module lib/scripts.ts Utilities for running scripts and getting their formatted output.
 *
 * @summary Script utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:39:13
 * Last modified  : 2024-01-13 01:05:17
 */

import { environment } from "@raycast/api";
import { execSync } from "child_process";
import path from "path";

/**
 * A summary of the user's current location as a JSON-serializable object.
 */
export type Location = {
  name: string;
  latitude: number;
  longitude: number;
  streetNumber: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

/**
 * The entry point for location-related scripts.
 */
export const LocationManager = {
  /**
   * Get all location data from the Location Manager applet.
   * @returns {Promise<Location | Record<string, string | number>>} A promise that resolves to a dictionary of location data.
   */
  getLocation: async (): Promise<Location | Record<string, string | number>> => {
    const LMAppPath = path.join(
      environment.assetsPath,
      "scripts",
      "PinsLocationManager.app",
      "Contents",
      "MacOS",
      "applet",
    );
    try {
      // Ensure the script is executable
      execSync(`chmod +x ${LMAppPath}`);

      // Run the script and parse the result
      const result = JSON.parse(execSync(LMAppPath).toString());
      return result;
    } catch (e) {
      console.error(e);
      return {};
    }
  },

  /**
   * Get a formatted street address from the Location Manager applet.
   * @returns {Promise<string>} A promise that resolves to the current street address.
   */
  getStreetAddress: async (): Promise<string> => {
    const location = await LocationManager.getLocation();
    return `${location.streetNumber} ${location.street}, ${location.city}, ${location.state} ${location.postalCode}, ${location.country}`;
  },

  /**
   * Get the user's country from the Location Manager applet.
   * @returns {Promise<string>} A promise that resolves to the current country.
   */
  getCountry: async (): Promise<string> => {
    const location = await LocationManager.getLocation();
    return location.country as string;
  },

  /**
   * Get the user's city from the Location Manager applet.
   * @returns {Promise<string>} A promise that resolves to the current city.
   */
  getCity: async (): Promise<string> => {
    const location = await LocationManager.getLocation();
    return location.city as string;
  },

  /**
   * Get the user's state from the Location Manager applet.
   * @returns {Promise<string>} A promise that resolves to the current state.
   */
  getState: async (): Promise<string> => {
    const location = await LocationManager.getLocation();
    return location.state as string;
  },

  /**
   * Get the user's postal code from the Location Manager applet.
   * @returns {Promise<string>} A promise that resolves to the current postal code.
   */
  getPostalCode: async (): Promise<string> => {
    const location = await LocationManager.getLocation();
    return location.postalCode as string;
  },

  /**
   * Get the user's current latitude from the Location Manager applet.
   * @returns {Promise<number>} A promise that resolves to the current latitude.
   */
  getLatitude: async (): Promise<number> => {
    const location = await LocationManager.getLocation();
    if ("latitude" in location) {
      return location.latitude as number;
    } else {
      return 0;
    }
  },

  /**
   * Get the user's current longitude from the Location Manager applet.
   * @returns {Promise<number>} A promise that resolves to the current longitude.
   */
  getLongitude: async (): Promise<number> => {
    const location = await LocationManager.getLocation();
    if ("longitude" in location) {
      return location.longitude as number;
    } else {
      return 0;
    }
  },
};

/**
 * Returns an AppleScript that plays a track in the Music app.
 * @param track The name of the track to play.
 * @param artist The artist of the track.
 * @param album The album of the track.
 * @returns {string} The AppleScript.
 */
export const getMusicTrackScript = (track: string, artist: string, album: string): string => {
  return `tell application "Music"
  set theTracks to every track whose name is "${track.replaceAll('"', '\\"')}"${
    artist.length ? `and artist is "${artist.replaceAll('"', '\\"')}"` : ""
  }${album.length ? `and album is "${album.replaceAll('"', '\\"')}"` : ""}
  if (count of theTracks) is 1 then
    set theTrack to item 1 of theTracks
    play theTrack
  end if
end tell`;
};

/**
 * Returns an AppleScript that plays a track in the Spotify app.
 * @param uri The URI of the track to play.
 * @returns {string} The AppleScript.
 */
export const getSpotifyTrackScript = (uri: string): string => {
  return `tell application "Spotify"
  play track "${uri}"
end tell`;
};

/**
 * Returns an AppleScript that plays a track in the TV app.
 * @param track The name of the track to play.
 * @param director The director of the track.
 * @param album The album of the track.
 * @returns {string} The AppleScript.
 */
export const getTVTrackScript = (track: string, director: string, album: string): string => {
  return `tell application "TV"
  
  set theTracks to every track whose name is "${track.replaceAll('"', '\\"')}"${
    director.length ? `and director is "${director.replaceAll('"', '\\"')}"` : ""
  }${album.length ? `and album is "${album.replaceAll('"', '\\"')}"` : ""}
  if (count of theTracks) is 1 then
    set theTrack to item 1 of theTracks
    play theTrack
  end if
end tell`;
};
