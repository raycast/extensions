/**
 * @module lib/scripts.ts Utilities for running scripts and getting their formatted output.
 *
 * @summary Script utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:39:13
 * Last modified  : 2023-09-04 17:39:47
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
      "applet"
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
