const ET_CLIENT_NAME = "norwegian-public-transport-raycast-extension";

const GEOCODER_URL = "https://api.entur.io/geocoder/v2/autocomplete";
const JOURNEY_PLANNER_URL = "https://api.entur.io/journey-planner/v3/graphql";

export interface StopPlace {
  id: string;
  name: string;
  locality?: string;
  county?: string;
}

export interface Departure {
  expectedDepartureTime: string;
  aimedDepartureTime: string;
  realtime: boolean;
  destinationDisplay: {
    frontText: string;
  };
  quay: {
    id: string;
    publicCode: string | null;
  };
  serviceJourney: {
    line: {
      publicCode: string;
      transportMode: string;
      transportSubmode: string | null;
    };
  };
  cancellation: boolean;
}

export async function searchStops(
  query: string,
  county: string,
): Promise<StopPlace[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    text: query,
    size: "10",
    layers: "venue",
  });

  const res = await fetch(`${GEOCODER_URL}?${params}`, {
    headers: { "ET-Client-Name": ET_CLIENT_NAME },
  });

  if (!res.ok) throw new Error(`Geocoder error: ${res.status}`);

  const data = (await res.json()) as {
    features?: Array<{
      properties: {
        id: string;
        name: string;
        locality?: string;
        county?: string;
      };
    }>;
  };

  return (data.features ?? [])
    .filter((f) => {
      if (!f.properties.id?.startsWith("NSR:StopPlace:")) return false;
      if (county !== "all" && f.properties.county !== county) return false;
      return true;
    })
    .map((f) => ({
      id: f.properties.id,
      name: f.properties.name,
      locality: f.properties.locality,
      county: f.properties.county,
    }));
}

const DEPARTURES_QUERY = `
  query Departures($id: String!, $startTime: DateTime!, $timeRange: Int!) {
    stopPlace(id: $id) {
      id
      name
      estimatedCalls(
        startTime: $startTime
        timeRange: $timeRange
        numberOfDepartures: 100
      ) {
        expectedDepartureTime
        aimedDepartureTime
        realtime
        cancellation
        destinationDisplay {
          frontText
        }
        quay {
          id
          publicCode
        }
        serviceJourney {
          line {
            publicCode
            transportMode
            transportSubmode
          }
        }
      }
    }
  }
`;

export async function getDepartures(stopId: string): Promise<Departure[]> {
  const startTime = new Date().toISOString();

  const res = await fetch(JOURNEY_PLANNER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ET-Client-Name": ET_CLIENT_NAME,
    },
    body: JSON.stringify({
      query: DEPARTURES_QUERY,
      variables: { id: stopId, startTime, timeRange: 3600 },
    }),
  });

  if (!res.ok) throw new Error(`Journey planner error: ${res.status}`);

  const data = (await res.json()) as {
    errors?: Array<{ message: string }>;
    data?: { stopPlace?: { estimatedCalls?: Departure[] } };
  };

  if (data.errors) {
    throw new Error(data.errors[0]?.message ?? "GraphQL error");
  }

  return data.data?.stopPlace?.estimatedCalls ?? [];
}
