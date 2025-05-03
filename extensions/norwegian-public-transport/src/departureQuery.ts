import { QuayLineFavorites } from "./types";

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
    }
  }
}
`;
const quayPart = (quayId: string, lineIds: string[]) => `
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
  }
}
`;
const estimatedCallsFragmentPart = `
fragment EC on EstimatedCall {
  date
  expectedDepartureTime
  aimedDepartureTime
  realtime
  predictionInaccurate
  cancellation
  quay {
    id
  }
  destinationDisplay {
    frontText
    via
  }
  serviceJourney {
    id
    directionType
    line {
      id
      description
      publicCode
      transportMode
      transportSubmode
      authority {
        id
        name
        url
      }
    }
    estimatedCalls {
      quay {
        id
        name
        publicCode
      }
      aimedDepartureTime
      expectedDepartureTime
    }
  }
}
`;

export function getDepartureQuery(favorites: QuayLineFavorites[]) {
  const quayParts = favorites.map((fav) => quayPart(fav.quayId, fav.lineIds));

  return `
    query stopPlaceQuayDepartures($id: String!, $numberOfDepartures: Int) {
      ${stopPlacePart}
      ${quayParts.join("\n")}
    }
    ${estimatedCallsFragmentPart}
  `;
}
