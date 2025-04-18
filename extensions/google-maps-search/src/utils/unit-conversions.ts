import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";

/**
 * Convert miles to kilometers
 * @param miles Distance in miles
 * @returns Distance in kilometers
 */
export function milesToKm(miles: number): number {
  return miles * 1.60934;
}

/**
 * Convert kilometers to miles
 * @param km Distance in kilometers
 * @returns Distance in miles
 */
export function kmToMiles(km: number): number {
  return km / 1.60934;
}

/**
 * Convert meters to feet
 * @param meters Distance in meters
 * @returns Distance in feet
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Convert feet to meters
 * @param feet Distance in feet
 * @returns Distance in meters
 */
export function feetToMeters(feet: number): number {
  return feet / 3.28084;
}

/**
 * Convert meters to miles
 * @param meters Distance in meters
 * @returns Distance in miles
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

/**
 * Convert miles to meters
 * @param miles Distance in miles
 * @returns Distance in meters
 */
export function milesToMeters(miles: number): number {
  return miles * 1609.34;
}

/**
 * Get the user's preferred unit system
 * @returns The user's preferred unit system ("metric" or "imperial")
 */
export function getUnitSystem(): "metric" | "imperial" {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.unitSystem || "metric";
}

/**
 * Get the default radius based on the user's preferred unit system
 * @returns Default radius as a string (5 for km, 3 for miles)
 */
export function getDefaultRadius(): string {
  const unitSystem = getUnitSystem();
  return unitSystem === "metric" ? "5" : "3";
}

/**
 * Get the default search radius in meters based on the user's preferred unit system
 * @returns Default search radius in meters
 */
export function getDefaultSearchRadiusInMeters(): number {
  const unitSystem = getUnitSystem();
  return unitSystem === "metric" ? 50000 : Math.round(31 * 1609.34);
}

/**
 * Get the user's preferred unit system for Google Maps API
 * This is a wrapper around getUnitSystem that returns the value as unknown to avoid type issues
 * @returns The user's preferred unit system as unknown type for Google Maps API
 */
export function getUnitSystemForApi(): unknown {
  return getUnitSystem() as unknown;
}

/**
 * Get the travel mode for Google Maps API
 * This is a helper to avoid type issues with the Google Maps API
 * @param mode The travel mode string
 * @returns The travel mode as unknown type for Google Maps API
 */
export function getTravelModeForApi(mode: string): unknown {
  return mode as unknown;
}
