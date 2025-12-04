export interface IStopPoint {
  id: string;
  url: string;
  commonName: string;
  distance: number;
  placeType: string;
  additionalProperties: IAdditionalProperty[];
  children: IChild[];
  childrenUrls: string[];
  lat: number;
  lon: number;
  matchQuality: IMatchQuality;
  name?: string;
  naptanId: string;
  modes: string[];
}

export interface IMatchQuality {
  matchQuality: number;
  matchType: string;
  confidence: number;
}

export interface IAdditionalProperty {
  category: string;
  key: string;
  sourceSystemKey: string;
  value: string;
}

export interface IChild {
  id: string;
  url: string;
  commonName: string;
  distance: number;
  placeType: string;
  additionalProperties: IAdditionalProperty[];
  children: IChild[];
  childrenUrls: string[];
  lat: number;
  lon: number;
  matchQuality: IMatchQuality;
  name: string;
  naptanId: string;
  modes: string[];
}

export interface IArrival {
  id: string;
  stationName: string;
  lineId: string;
  lineName: string;
  platformName: string;
  direction: string;
  towards: string;
  expectedArrival: string;
  timeToStation: number;
  modeName: string;
  lineStatuses: ILineStatus[];
  disruption?: IDisruption;
}

export interface ILineStatus {
  id: number;
  statusSeverity: number;
  statusSeverityDescription: string;
  reason?: string;
  created?: string;
  validityPeriods?: IValidityPeriod[];
}

export interface IValidityPeriod {
  fromDate: string;
  toDate: string;
  isNow: boolean;
}

export interface IDisruption {
  category: string;
  description: string;
  additionalInfo: string;
  created: string;
  affectedRoutes: IAffectedRoute[];
}

export interface IAffectedRoute {
  id: string;
  name: string;
  direction: string;
}

export interface IDeparture {
  id: string;
  stationName: string;
  lineId: string;
  lineName: string;
  platformName: string;
  direction: string;
  towards: string;
  expectedDeparture: string;
  timeToStation: number;
  modeName: string;
  additionalProperties: IAdditionalProperty[];
}

export interface IAdditionalProperty {
  category: string;
  key: string;
  sourceSystemKey: string;
  value: string;
}
