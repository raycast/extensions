import { DestinationDisplay, DirectionType, TransportMode } from "../types";

export type Quay = {
  id: string;
  name: string;
  publicCode?: string;
  stopPlace?: { id: string };
};
export const quayFragment = `
fragment Q on Quay {
  id
  name
  publicCode
  stopPlace {
    id
  }
}
`;

export type EstimatedCall = {
  date: string;
  expectedDepartureTime: string | null;
  aimedDepartureTime: string;
  realtime: boolean;
  predictionInaccurate: boolean;
  cancellation: boolean;
  quay: { id: string; name: string; publicCode?: string };
  destinationDisplay?: DestinationDisplay;
};
export const estimatedCallFragment = `
fragment EC on EstimatedCall {
  date
  expectedDepartureTime
  aimedDepartureTime
  realtime
  predictionInaccurate
  cancellation
  quay {
    id
    name
    publicCode
  }
  destinationDisplay {
    frontText
    via
  }
}
`;

export type ServiceJourney = {
  id: string;
  directionType: DirectionType;
  line: Line;
};
export const serviceJourneyFragment = `
fragment SJ on ServiceJourney {
  id
  directionType
  line {
    ...L
  }
}
`;

export type Line = {
  id: string;
  description?: string;
  publicCode?: string;
  transportMode?: TransportMode;
  transportSubmode?: string;
  authority?: Authority;
};
export const lineFragment = `
fragment L on Line {
  id
  description
  publicCode
  transportMode
  transportSubmode
  authority {
    ...A
  }
}
`;

export type Authority = {
  id: string;
  name: string;
  url?: string;
};
export const authorityFragment = `
fragment A on Authority {
  id
  name
  url
}
`;
