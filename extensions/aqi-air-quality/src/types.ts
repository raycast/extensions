export type LocationInfo = {
  latitude: number;
  longitude: number;
  label: string;
  source: "manual" | "ip";
  countryCode?: string | null;
  continentCode?: string | null;
};

export type AirQualitySource = "iqair" | "open-meteo";

export type AqiScale = "us" | "european";

export type Pollutants = {
  carbonMonoxide: number | null;
  nitrogenDioxide: number | null;
  sulphurDioxide: number | null;
  ozone: number | null;
  dust: number | null;
  uvIndex: number | null;
  uvIndexClearSky: number | null;
};

export type EeaModelledInfo = {
  timeIso: string;
  aqi: number;
  aqiNo2: number | null;
  aqiPm10: number | null;
  aqiPm25: number | null;
  aqiO3: number | null;
  culprit: string | null;
  valNo2: number | null;
  valPm10: number | null;
  valPm25: number | null;
  valO3: number | null;
  bandIndex: number;
  bandLabel: string;
  bandEmoji: string;
  generalMessage: string;
  sensitiveMessage: string;
};

export type AirQualitySnapshot = {
  aqi: number;
  aqiUs?: number | null;
  aqiEu?: number | null;
  pm10: number | null;
  pm25: number | null;
  timeIso?: string;
  source: AirQualitySource;
  aqiScale: AqiScale;
  pollutants: Pollutants | null;
};

export type ProviderReport = {
  id: "open-meteo" | "iqair" | "eea";
  label: string;
  updatedAtIso?: string | null;
  aqiUs?: number | null;
  aqiEu?: number | null;
  eeaIndex?: number | null;
  pm25?: number | null;
  pm10?: number | null;
  ozone?: number | null;
  no2?: number | null;
  so2?: number | null;
  co?: number | null;
  dust?: number | null;
};
