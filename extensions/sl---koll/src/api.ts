export interface Stop {
  name: string;
  id: string;
  lat: number;
  lon: number;
}

export interface Departure {
  destination: string;
  direction: string;
  displayTime: string;
  lineNumber: string;
  transportMode: string;
  transportCategory: string;
  stopPointNumber: string;
}

interface ResRobotStop {
  id: string;
  name: string;
  lon: number;
  lat: number;
}

interface ResRobotStopLookupResponse {
  stopLocationOrCoordLocation?: Array<{
    StopLocation?: ResRobotStop;
  }>;
  StopLocation?: ResRobotStop[] | ResRobotStop;
}

interface ResRobotDeparture {
  name: string; // e.g. "Länstrafik - Buss 815"
  type: string; // "JNY", "WALK"
  stop: string;
  time: string; // "HH:MM:SS"
  date: string; // "YYYY-MM-DD"
  direction: string;
  transportNumber: string;
  transportCategory: string; // "B", "M", "J" etc
  Product?: {
    name: string;
    num: string;
    catCode: string; // "7" for bus, etc.
  };
}

interface ResRobotDepartureBoardResponse {
  Departure: ResRobotDeparture[];
}

const RESROBOT_API_URL = "https://api.resrobot.se/v2.1";
// Hardcoded key provided by user for immediate usage
const API_KEY = "2ac1ebd6-09b7-4c86-a409-1d563cec82ee";

export async function searchStop(searchString: string): Promise<Stop[]> {
  // const preferences = getPreferenceValues<Preferences>();
  const key = API_KEY;
  const url = `${RESROBOT_API_URL}/location.name?accessId=${key}&input=${encodeURIComponent(searchString)}&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching stops: ${response.statusText}`);
    }
    const data = (await response.json()) as ResRobotStopLookupResponse;

    let rawStops: ResRobotStop[] = [];

    // Handle different response structures
    if (data.stopLocationOrCoordLocation) {
      // New structure seen in curl
      data.stopLocationOrCoordLocation.forEach((item) => {
        if (item.StopLocation) {
          rawStops.push(item.StopLocation);
        }
      });
    } else if (data.StopLocation) {
      // Old/Alternative structure
      if (Array.isArray(data.StopLocation)) {
        rawStops = data.StopLocation;
      } else {
        rawStops = [data.StopLocation];
      }
    }

    return rawStops.map((item) => ({
      name: item.name,
      id: item.id,
      lat: item.lat,
      lon: item.lon,
    }));
  } catch (error) {
    console.error("Failed to search stops:", error);
    return [];
  }
}

export async function getDepartures(siteId: string): Promise<Departure[]> {
  // const preferences = getPreferenceValues<Preferences>();
  const key = API_KEY;
  const url = `${RESROBOT_API_URL}/departureBoard?accessId=${key}&id=${siteId}&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching departures: ${response.statusText}`);
    }
    const data = (await response.json()) as ResRobotDepartureBoardResponse;

    if (!data.Departure) {
      return [];
    }

    return data.Departure.map((item) => {
      // Parse time to display format if needed, but ResRobot gives HH:MM:SS
      const time = item.time.substring(0, 5); // HH:MM

      // Try to extract line number and category
      let line = item.transportNumber;
      let category = item.transportCategory;

      if (item.Product) {
        if (item.Product.num) {
          line = item.Product.num;
        }
        if (item.Product.catCode) {
          category = item.Product.catCode;
        }
      }

      // Fallback: If line is still undefined/empty, try to extract from name
      if (!line) {
        const nameToParse = item.Product?.name || item.name;
        if (nameToParse) {
          // Match standard format like "Buss 50", "Tåg 43", "Tunnelbana 14"
          // Looks for a number at the end of the string
          const match = nameToParse.match(/(\d+[A-Za-z]?)$/);
          if (match) {
            line = match[1];
          } else {
            // Fallback 2: Try to match number after transport mode (e.g. "Länstrafik - Tunnelbana 14")
            const parts = nameToParse.split(" ");
            const lastPart = parts[parts.length - 1];
            if (/^\d+[A-Za-z]?$/.test(lastPart)) {
              line = lastPart;
            }
          }
        }
      }

      return {
        destination: item.direction,
        direction: item.direction,
        displayTime: time,
        lineNumber: line || "", // Ensure we never display "undefined"
        transportMode: item.name, // Full name like "Buss 401"
        transportCategory: category,
        stopPointNumber: "", // Not always available
      };
    });
  } catch (error) {
    console.error("Failed to fetch departures:", error);
    return [];
  }
}
