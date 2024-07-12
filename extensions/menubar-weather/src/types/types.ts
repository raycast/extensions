// Open-Meteo weather
export interface OpenMeteoWeather {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_weather: CurrentWeather;
  hourly_units: HourlyUnits;
  hourly: Hourly;
  daily_units: DailyUnits;
  daily: Daily;
}

export interface CurrentWeather {
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  time: string;
}

export interface Daily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  sunrise: string[];
  sunset: string[];
  rain_sum: number[];
  weathercode: number[];
  windspeed_10m_max: number[];
  winddirection_10m_dominant: number[];
  uv_index_max: number[];
}

export interface DailyUnits {
  time: string;
  temperature_2m_max: string;
  temperature_2m_min: string;
  sunrise: string;
  sunset: string;
  rain_sum: string;
}

export interface Hourly {
  time: string[];
  temperature_2m: number[];
  relativehumidity_2m: number[];
  apparent_temperature: number[];
  precipitation: number[];
  rain: number[];
  weathercode: number[];
  surface_pressure: number[];
  visibility: number[];
  winddirection_120m: number[];
}

export interface HourlyUnits {
  time: string;
  temperature_2m: string;
  relativehumidity_2m: string;
  apparent_temperature: string;
  precipitation: string;
  rain: string;
  weathercode: string;
  surface_pressure: string;
  visibility: string;
  winddirection_120m: string;
}

//Open-Meteo Geolocation
export interface OpenMeteoGeoLocation {
  results: GeoLocation[];
  generationtime_ms: number;
}

export interface GeoLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  feature_code?: string;
  country_code?: string;
  admin1_id?: number;
  admin2_id?: number;
  timezone: string;
  population?: number;
  country_id?: number;
  country: string;
  admin1?: string;
  admin2?: string;
}

export interface KLocation {
  latitude: number;
  longitude: number;
  thoroughfare?: string;
  subThoroughfare?: string;
  locality?: string;
  subLocality?: string;
  administrativeArea?: string;
  subAdministrativeArea?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
}
