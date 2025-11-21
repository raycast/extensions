import {
  LocationSearchResult,
  WeatherForecastResponse,
  ApiError,
  TimeStep,
  WeatherUnits,
  MeteoblueLocationSearchResponse,
  MeteoblueLocation,
  GeoJsResponse,
  MeteoblueApiResponse,
  MeteobluePackageData,
} from "./types";

const METEOBLUE_BASE_URL = "https://my.meteoblue.com";

/**
 * Search for a location by city name using Meteoblue Location Search API
 */
export async function searchLocation(
  query: string,
  apikey: string,
): Promise<LocationSearchResult[]> {
  if (!query || query.trim().length === 0) {
    throw new Error("Location query cannot be empty");
  }

  try {
    // Use Meteoblue Location Search API
    // Endpoint: https://www.meteoblue.com/en/server/search/query3
    const url = `https://www.meteoblue.com/en/server/search/query3?query=${encodeURIComponent(query)}&apikey=${apikey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Location search failed with status ${response.status}`);
    }

    const data = (await response.json()) as MeteoblueLocationSearchResponse;

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    // Transform Meteoblue results to LocationSearchResult format
    return data.results.map((item: MeteoblueLocation) => {
      return {
        id: item.id?.toString() || String(Math.random()),
        name: item.name || query,
        country: item.country || item.iso2 || "",
        admin1: item.admin1 || undefined,
        admin2: undefined, // Meteoblue doesn't usually provide a secondary admin level in this endpoint
        latitude:
          typeof item.lat === "number"
            ? item.lat
            : parseFloat(String(item.lat)),
        longitude:
          typeof item.lon === "number"
            ? item.lon
            : parseFloat(String(item.lon)),
        elevation: item.asl ? parseFloat(String(item.asl)) : undefined,
        timezone: item.timezone || undefined,
      };
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to search location: " + String(error));
  }
}

/**
 * Get current location based on IP address
 */
export async function getCurrentLocation(): Promise<LocationSearchResult> {
  try {
    const response = await fetch("https://get.geojs.io/v1/ip/geo.json");

    if (!response.ok) {
      throw new Error("Failed to detect location");
    }

    const data = (await response.json()) as GeoJsResponse;

    return {
      id: "current-location",
      name: data.city || "Current Location",
      country: data.country_code || data.country || "",
      admin1: data.region,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      timezone: data.timezone,
    };
  } catch (error) {
    throw new Error(
      "Failed to get current location: " +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}

/**
 * Get weather forecast for a specific location using the basic package
 * Uses basic-1h (hourly) and basic-day (daily) intervals
 */
export async function getWeatherForecast(
  lat: number,
  lon: number,
  apikey: string,
  units?: WeatherUnits,
  elevation?: number,
): Promise<WeatherForecastResponse> {
  if (!apikey) {
    throw new Error("API key is required");
  }

  if (isNaN(lat) || isNaN(lon)) {
    throw new Error("Invalid latitude or longitude");
  }

  try {
    // Use basic package with 1h and daily intervals
    // Format: packages/basic-1h_basic-day
    let url = `${METEOBLUE_BASE_URL}/packages/basic-1h_basic-day?lat=${lat}&lon=${lon}&apikey=${apikey}&format=json`;

    if (units) {
      if (units.temperature) url += `&temperature=${units.temperature}`;
      if (units.windspeed) url += `&windspeed=${units.windspeed}`;
      if (units.precipitation)
        url += `&precipitationamount=${units.precipitation}`;
    }

    if (elevation !== undefined && !isNaN(elevation)) {
      url += `&asl=${elevation}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API request failed with status ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText) as ApiError;
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = (await response.json()) as MeteoblueApiResponse;

    // Helper to parse column-oriented data to row-oriented TimeSteps
    const parsePackage = (
      pkgData: MeteobluePackageData | TimeStep[] | unknown,
    ): TimeStep[] => {
      if (!pkgData) return [];

      // Case 1: Already an array of objects (row-oriented)
      if (Array.isArray(pkgData)) {
        // Check if it looks like TimeStep (has time property)
        if (
          pkgData.length > 0 &&
          "time" in (pkgData[0] as Record<string, unknown>)
        ) {
          return pkgData as TimeStep[];
        }
        // Fallback or empty array if it's an array but not what we expect (Meteoblue usually sends object for columns)
        // But sometimes for single values it might be different.
        // However, raw API typically sends object with time array.
      }

      // Case 2: Column-oriented object (Meteoblue standard)
      // Should have 'time' array and other value arrays
      if (
        typeof pkgData === "object" &&
        pkgData !== null &&
        "time" in pkgData &&
        Array.isArray((pkgData as MeteobluePackageData).time)
      ) {
        const typedPkg = pkgData as MeteobluePackageData;
        const length = typedPkg.time.length;
        const result: TimeStep[] = [];

        for (let i = 0; i < length; i++) {
          const step: TimeStep = { time: typedPkg.time[i] };
          for (const key of Object.keys(typedPkg)) {
            if (key !== "time" && Array.isArray(typedPkg[key])) {
              const val = typedPkg[key][i];
              if (typeof val === "number" || typeof val === "string") {
                step[key] = val;
              }
            }
          }
          result.push(step);
        }
        return result;
      }

      return [];
    };

    interface NormalizedPackage {
      units: Record<string, string>;
      data?: TimeStep[];
    }

    let hourlyPackage: NormalizedPackage | undefined = undefined;
    let dailyPackage: NormalizedPackage | undefined = undefined;

    // Check for flattened structure first (data_1h and data_day at top level)
    if (data.data_1h) {
      hourlyPackage = {
        units: data.units || {},
        data: parsePackage(data.data_1h),
      };
    }

    if (data.data_day) {
      dailyPackage = {
        units: data.units || {},
        data: parsePackage(data.data_day),
      };
    }

    // If flattened structure not found, try nested package structure
    if (!hourlyPackage || !dailyPackage) {
      // Try direct key access for nested packages
      let nestedHourly: unknown = data["basic-1h"];
      let nestedDaily: unknown = data["basic-day"];

      interface PotentialPackage {
        data_1h?: unknown;
        data_day?: unknown;
        time?: unknown;
        [key: string]: unknown;
      }

      // If direct keys don't exist, try alternative formats
      if (!nestedHourly) {
        nestedHourly =
          data["basic_1h"] ||
          data.basic ||
          (typeof data === "object" && data !== null
            ? Object.values(data).find((pkg: unknown) => {
                if (!pkg || typeof pkg !== "object") return false;
                const p = pkg as PotentialPackage;
                return p.data_1h || (p.time && !p.data_day);
              })
            : undefined);
      }

      if (!nestedDaily) {
        nestedDaily =
          data["basic_day"] ||
          data.basicDay ||
          (typeof data === "object" && data !== null
            ? Object.values(data).find((pkg: unknown) => {
                if (!pkg || typeof pkg !== "object") return false;
                const p = pkg as PotentialPackage;
                return p.data_day || (p.time && !p.data_1h);
              })
            : undefined);
      }

      // Use nested packages if found and we don't have flattened data
      if (nestedHourly && !hourlyPackage) {
        const pkg = nestedHourly as {
          units?: Record<string, string>;
          data_1h?: unknown;
        };
        hourlyPackage = {
          units: pkg.units || data.units || {},
          data: parsePackage(pkg.data_1h || pkg),
        };
      }

      if (nestedDaily && !dailyPackage) {
        const pkg = nestedDaily as {
          units?: Record<string, string>;
          data_day?: unknown;
        };
        dailyPackage = {
          units: pkg.units || data.units || {},
          data: parsePackage(pkg.data_day || pkg),
        };
      }
    }

    const normalizedData: WeatherForecastResponse = {
      metadata: data.metadata,
      units: data.units,
      basic: hourlyPackage
        ? {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            units: hourlyPackage.units as any,
            data_1h: hourlyPackage.data,
          }
        : undefined,
      basicDay: dailyPackage
        ? {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            units: dailyPackage.units as any,
            data_day: dailyPackage.data,
          }
        : undefined,
    };

    // Log for debugging if no data found
    if (
      !normalizedData.basic?.data_1h?.length &&
      !normalizedData.basicDay?.data_day?.length
    ) {
      console.error(
        "Failed to parse weather data. Response keys:",
        Object.keys(data),
      );
      throw new Error(
        `Failed to parse weather data. Response keys: ${JSON.stringify(Object.keys(data))}`,
      );
    }

    return normalizedData;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch forecast: " + String(error));
  }
}
