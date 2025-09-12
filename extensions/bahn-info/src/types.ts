export interface TripResponse {
  trip: Trip;
  connection: Connection | null;
  active: null;
}

export interface Trip {
  tripDate: string;
  trainType: string;
  vzn: string | number;
  actualPosition: number;
  distanceFromLastStop: number;
  totalDistance: number;
  stopInfo: StopInfo;
  stops: Station[];
}

export interface StopInfo {
  scheduledNext: string | number;
  actualNext: string | number;
  actualLast: string | number;
  actualLastStarted: string | number;
  finalStationName: string;
  finalStationEvaNr: string | number;
}

export interface Station {
  station: {
    evaNr: string | number;
    name: string;
    code: string | null;
    geocoordinates: {
      latitude: number;
      longitude: number;
    };
  };
  timetable: {
    scheduledArrivalTime: number | null;
    actualArrivalTime: number | null;
    showActualArrivalTime: boolean | null;
    arrivalDelay: string | null;
    scheduledDepartureTime: number | null;
    actualDepartureTime: number | null;
    showActualDepartureTime: boolean | null;
    departureDelay: string | null;
  };
  track: {
    scheduled: string | null;
    actual: string | null;
  };
  info: {
    status: number;
    passed: boolean;
    positionStatus: string;
    distance: number;
    distanceFromStart: number;
  };
  delayReasons: DelayReason[] | null;
}

export interface DelayReason {
  code: string;
  text: string;
}

export interface Connection {
  [key: string]: unknown;
}

export interface StatusResponse {
  connection: boolean;
  serviceLevel: string;
  internet: string;
  latitude: number;
  longitude: number;
  tileY: number;
  tileX: number;
  series: string;
  serverTime: number;
  speed: number;
  trainType: string;
  tzn: string;
  wagonClass: string;
  connectivity: {
    currentState: string;
    nextState: string;
    remainingTimeSeconds: number;
  };
  bapInstalled: boolean;
  gpsStatus: string;
}

export interface TrainInfo {
  trip: Trip | null;
  status: StatusResponse | null;
  isOnTrain: boolean;
  error?: string;
}
