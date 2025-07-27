import { QuayLineFavorites } from "../types";
import {
  authorityFragment,
  EstimatedCall,
  estimatedCallFragment,
  lineFragment,
  ServiceJourney,
  serviceJourneyFragment,
} from "./fragments";

export function getDepartureQueryDocument(favorites: QuayLineFavorites[]) {
  const quayParts = favorites.map((fav) => quaysWithFavorites(fav.quayId, fav.lineIds));

  return `
    query stopPlaceQuayDepartures($id: String!, $numberOfDepartures: Int) {
      ${stopPlacePart}
      ${quayParts.join("\n")}
    }
    ${estimatedCallFragment}
    ${serviceJourneyFragment}
    ${lineFragment}
    ${authorityFragment}
  `;
}
export type DeparturesQuery = {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  quays?: Array<QuayDepartures>;
};
export type QuayDepartures = {
  id: string;
  name: string;
  description?: string;
  publicCode?: string;
  estimatedCalls: Array<Departure>;
};

/**
 * Helper type for an estimated call with its service journey and all the
 * estimated calls in the service journey.
 */
export type Departure = EstimatedCall & {
  serviceJourney: ServiceJourney & {
    estimatedCalls: EstimatedCall[];
  };
};

const stopPlacePart = `
stopPlace(id: $id) {
  id
  name
  description
  latitude
  longitude
  quays(filterByInUse: true) {
    id
    name
    description
    publicCode
    estimatedCalls(numberOfDepartures: $numberOfDepartures, timeRange: 604800) {
      ...EC
      serviceJourney {
        ...SJ
        estimatedCalls {
          ...EC
        }
      }
    }
  }
}
`;

const quaysWithFavorites = (quayId: string, lineIds: string[]) => `
${quayId.replaceAll(":", "_")}: quay(id: "${quayId}") {
  id
  name
  description
  publicCode
  estimatedCalls(
    numberOfDepartures: $numberOfDepartures
    timeRange: 604800
    whiteListed: {lines: ${JSON.stringify(lineIds)}}
  ) {
    ...EC
    serviceJourney {
      ...SJ
      estimatedCalls {
        ...EC
      }
    }
  }
}
`;
