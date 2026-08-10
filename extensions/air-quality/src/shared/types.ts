export type Attribution = {
  url: string;
  name: string;
};

export type City = {
  geo: [number, number];
  name: string;
  url: string;
  location: string;
};

export type Iaqi = {
  co?: {
    v: number;
  };
  h?: {
    v: number;
  };
  no2?: {
    v: number;
  };
  o3?: {
    v: number;
  };
  p?: {
    v: number;
  };
  pm10?: {
    v: number;
  };
  pm25?: {
    v: number;
  };
  so2?: {
    v: number;
  };
  t?: {
    v: number;
  };
  w?: {
    v: number;
  };
};

export type Time = {
  s: string;
  tz: string;
  v: number;
  iso: string;
};

export type Forecast = {
  daily: {
    o3: {
      avg: number;
      day: string;
      max: number;
      min: number;
    }[];
    pm10: {
      avg: number;
      day: string;
      max: number;
      min: number;
    }[];
    pm25: {
      avg: number;
      day: string;
      max: number;
      min: number;
    }[];
    uvi: {
      avg: number;
      day: string;
      max: number;
      min: number;
    }[];
  };
};

export type AirQualityData = {
  aqi: number;
  idx: number;
  attributions: Attribution[];
  city: City;
  dominentpol: string;
  iaqi: Iaqi;
  time: Time;
  forecast?: Forecast;
  debug: {
    sync: string;
  };
};

export type Preferences = {
  apiToken: string;
  city?: string;
};

export type PollutionLevelAndImplication = {
  level: number;
  levelName: string;
  implication: string;
};
