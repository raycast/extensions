import { TransportType } from "./core";

/**
 * Interface for distance information
 */
export interface Distance {
  text: string;
  value: number; // in meters
}

/**
 * Interface for duration information
 */
export interface Duration {
  text: string;
  value: number; // in seconds
}

/**
 * Interface for route information
 */
export interface RouteInfo {
  distance: Distance;
  duration: Duration;
  startAddress: string;
  endAddress: string;
  steps: RouteStep[];
  polyline: string; // encoded polyline
}

/**
 * Interface for route steps
 */
export interface RouteStep {
  distance: Distance;
  duration: Duration;
  instructions: string;
  travelMode: TransportType;
  polyline: string; // encoded polyline
}
