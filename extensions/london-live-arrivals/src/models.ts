export interface StopPointSearchResponse {
  $type: string;
  query: string;
  total: number;
  matches: MatchedStop[];
}

export interface MatchedStop {
  $type: string;
  icsId: string;
  topMostParentId: string;
  modes: string[];
  zone?: string;
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Arrival {
  id: string;
  operationType: number;
  vehicleId: string;
  naptanId: string;
  stationName: string;
  lineId: string;
  lineName: string;
  platformName: string;
  direction: string;
  bearing: string;
  destinationNaptanId: string;
  destinationName: string;
  timestamp: string;
  timeToStation: number;
  currentLocation: string;
  towards: string;
  expectedArrival: string;
  timeToLive: string;
  modeName: string;
}
