// External library imports
import { getPreferenceValues } from "@raycast/api";

// Internal type exports
import { Preferences } from "../types";

// Conversion constants
export const KM_PER_MILE = 1.60934;
export const FEET_PER_METER = 3.28084;
export const METERS_PER_MILE = 1609.34;

// Default values
export const DEFAULT_RADIUS_KM = 5;
export const DEFAULT_RADIUS_MILES = 3;
export const DEFAULT_SEARCH_RADIUS_KM = 50000; // 50km in meters
export const DEFAULT_SEARCH_RADIUS_MILES = 30; // miles

/**
 * Convert miles to kilometers
 * @param miles Distance in miles
 * @returns Distance in kilometers
 */
export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

/**
 * Convert kilometers to miles
 * @param km Distance in kilometers
 * @returns Distance in miles
 */
export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

/**
 * Convert meters to feet
 * @param meters Distance in meters
 * @returns Distance in feet
 */
export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER;
}

/**
 * Convert feet to meters
 * @param feet Distance in feet
 * @returns Distance in meters
 */
export function feetToMeters(feet: number): number {
  return feet / FEET_PER_METER;
}

/**
 * Convert meters to miles
 * @param meters Distance in meters
 * @returns Distance in miles
 */
export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

/**
 * Convert miles to meters
 * @param miles Distance in miles
 * @returns Distance in meters
 */
export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE;
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
 * @returns Default radius as a number (5 for km, 3 for miles)
 */
export function getDefaultRadius(): number {
  const unitSystem = getUnitSystem();
  return unitSystem === "metric" ? DEFAULT_RADIUS_KM : DEFAULT_RADIUS_MILES;
}

/**
 * Get the default search radius in meters based on the user's preferred unit system
 * @returns Default search radius in meters
 */
export function getDefaultSearchRadiusInMeters(): number {
  const unitSystem = getUnitSystem();
  return unitSystem === "metric" ? DEFAULT_SEARCH_RADIUS_KM : Math.round(DEFAULT_SEARCH_RADIUS_MILES * METERS_PER_MILE);
}
