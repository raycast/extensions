/**
 * Interface for route information
 */
export interface RouteInfo {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  startAddress: string;
  endAddress: string;
  steps: RouteStep[];
  polyline: string; // encoded polyline
}

/**
 * Interface for route steps
 */
export interface RouteStep {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  instructions: string;
  travelMode: string;
  polyline: string; // encoded polyline
}
