export interface IStation {
  type: string;
  id: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  name?: string;
  location?: Location;
  products?: Products;
  stationDHID?: string;
}

export interface Location {
  type: string;
  id: string;
  latitude: number;
  longitude: number;
}

export interface Products {
  suburban: boolean;
  subway: boolean;
  tram: boolean;
  bus: boolean;
  ferry: boolean;
  express: boolean;
  regional: boolean;
}

export interface IDeparture {
  tripId: string;
  stop: Destination;
  when: Date;
  plannedWhen: Date;
  delay: number;
  platform: string;
  plannedPlatform: string;
  prognosisType: string;
  direction: string;
  provenance: null;
  line: Line;
  remarks: Remark[];
  origin: null;
  destination: Destination;
  currentTripPosition: Tion;
  occupancy: string;
}

export interface Tion {
  type: string;
  latitude: number;
  longitude: number;
  id?: string;
}

export interface Destination {
  type: string;
  id: string;
  name: string;
  location: Tion;
  products: Products;
  stationDHID: string;
}

export interface Line {
  type: string;
  id: string;
  fahrtNr: string;
  name: string;
  public: boolean;
  adminCode: string;
  productName: string;
  mode: string;
  product: string;
  operator: Operator;
  symbol: string;
  nr: number;
  metro: boolean;
  express: boolean;
  night: boolean;
}

export interface Operator {
  type: string;
  id: string;
  name: string;
}

export interface Remark {
  type: string;
  code: string;
  text: string;
}
