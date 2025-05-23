import { TravelMode, UnitSystem } from "@googlemaps/google-maps-services-js";

/**
 * Types for Google Maps API parameters
 */

/**
 * Re-export travel modes from Google Maps API
 * @see https://developers.google.com/maps/documentation/directions/get-directions#TravelModes
 */
export { TravelMode };

/**
 * Re-export unit systems from Google Maps API
 * @see https://developers.google.com/maps/documentation/directions/get-directions#UnitSystems
 */
export { UnitSystem };

/**
 * Parameters for Google Maps Directions API
 * @see https://developers.google.com/maps/documentation/directions/get-directions#request-parameters
 */
export interface GoogleMapsDirectionsParams {
  origin: string;
  destination: string;
  mode: TravelMode;
  key: string;
  units: UnitSystem;
  alternatives?: boolean;
  avoid?: "tolls" | "highways" | "ferries" | "indoor";
  language?: string;
  region?: string;
  traffic_model?: "best_guess" | "pessimistic" | "optimistic";
  transit_mode?: "bus" | "subway" | "train" | "tram" | "rail";
  transit_routing_preference?: "less_walking" | "fewer_transfers";
}
