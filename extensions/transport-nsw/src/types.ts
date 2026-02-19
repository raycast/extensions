// Transport mode IDs from NSW Transport API
export const TransportMode = {
  Train: 1,
  Metro: 2,
  LightRail: 4,
  Bus: 5,
  Coach: 7,
  Ferry: 9,
  SchoolBus: 11,
} as const;

export type TransportModeId = (typeof TransportMode)[keyof typeof TransportMode];

export interface Stop {
  id: string;
  name: string;
  disassembledName?: string;
  type: string;
  coord?: [number, number];
  parent?: {
    id: string;
    name: string;
    type: string;
  };
  productClasses?: number[];
}

export interface StopFinderResponse {
  locations: StopLocation[];
}

export interface StopLocation {
  id: string;
  name: string;
  disassembledName?: string;
  type: string;
  coord?: [number, number];
  parent?: {
    id: string;
    name: string;
    type: string;
  };
  productClasses?: number[];
  modes?: number[];
  matchQuality?: number;
  isBest?: boolean;
  properties?: {
    stopId?: string;
    mainLocality?: string;
  };
}

export interface SavedTrip {
  id: string;
  name: string;
  origin: {
    id: string;
    name: string;
  };
  destination: {
    id: string;
    name: string;
  };
  createdAt: string;
}
