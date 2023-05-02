export interface Trainrides {
  version: string;
  timestamp: string;
  connection: Connection[];
}

export interface Connection {
  id: string;
  departure: Departure;
  arrival: Arrival;
  vias?: Vias;
  duration: string;
}

export interface Departure {
  delay: string;
  station: string;
  time: string;
  platform: string;
  canceled: string;
}

export interface Arrival {
  delay: string;
  station: string;
  time: string;
  platform: string;
  canceled: string;
}

export interface Vias {
  number: string;
  via: Via[];
}

export interface Via {
  id: string;
  arrival: Arrival;
  departure: Departure;
  station: string;
  timeBetween: string;
}
