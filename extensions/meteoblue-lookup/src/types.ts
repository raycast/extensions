// TypeScript interfaces for meteoblue API responses

export interface LocationSearchResult {
  id: string;
  name: string;
  country: string;
  admin1?: string;
  admin2?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone?: string;
}

export interface TimeStep {
  time: string;
  precipitation?: number;
  snowfraction?: number;
  rainspot?: string;
  temperature?: number;
  temperature_max?: number;
  temperature_min?: number;
  temperature_mean?: number;
  felttemperature?: number;
  pictocode?: number;
  windspeed?: number;
  windspeed_max?: number;
  windspeed_min?: number;
  windspeed_mean?: number;
  winddirection?: number;
  relativehumidity?: number;
  sealevelpressure?: number;
  totalcloudcover?: number;
  uvindex?: number;
  predictability?: number;
  // Allow for other properties that might come from API
  [key: string]: string | number | undefined;
}

export interface BasicPackage {
  units: {
    time: string;
    precipitation: string;
    snowfraction: string;
    temperature: string;
    felttemperature: string;
    windspeed: string;
    winddirection: string;
    relativehumidity: string;
    sealevelpressure: string;
    totalcloudcover: string;
    uvindex: string;
    predictability: string;
    // Allow for other units
    [key: string]: string;
  };
  data_1h?: TimeStep[];
  data_3h?: TimeStep[];
  data_15min?: TimeStep[];
  data_day?: TimeStep[];
}

export interface WeatherForecastResponse {
  metadata?: {
    version?: string;
    modelrun_init?: string;
    modelrun_init_utc?: string;
    modelrun_updated?: string;
    modelrun_updated_utc?: string;
    location?: {
      latitude: number;
      longitude: number;
      elevation?: number;
      timezone?: string;
    };
  };
  units?: Record<string, string>;
  basic?: BasicPackage;
  basicDay?: BasicPackage;
}

export interface ApiError {
  error: string;
  message?: string;
}

export interface WeatherUnits {
  temperature: string;
  windspeed: string;
  precipitation: string;
}

// Raw API types
export interface MeteoblueLocation {
  id?: string | number;
  name: string;
  country?: string;
  iso2?: string;
  admin1?: string;
  lat: number | string;
  lon: number | string;
  asl?: string | number;
  timezone?: string;
}

export interface MeteoblueLocationSearchResponse {
  results: MeteoblueLocation[];
}

export interface GeoJsResponse {
  city?: string;
  country_code?: string;
  country?: string;
  region?: string;
  latitude: string;
  longitude: string;
  timezone?: string;
}

export interface MeteobluePackageData {
  time: string[];
  [key: string]: (number | string)[];
}

export interface MeteoblueApiResponse {
  metadata?: WeatherForecastResponse["metadata"];
  units?: Record<string, string>;
  data_1h?: MeteobluePackageData | TimeStep[]; // Could be column or row oriented
  data_day?: MeteobluePackageData | TimeStep[];
  "basic-1h"?:
    | MeteobluePackageData
    | { data_1h: MeteobluePackageData; units?: Record<string, string> };
  "basic-day"?:
    | MeteobluePackageData
    | { data_day: MeteobluePackageData; units?: Record<string, string> };
  basic?: MeteobluePackageData;
  basicDay?: MeteobluePackageData;
  // Other potential keys
  [key: string]: unknown;
}
