export interface Preferences {
  sncfApiKey: string;
}

export const STORAGE_JOURNEYS_KEY = "journeys";

export interface Storage {
  journeys: Journey[];
}

export type Journey = {
  departure: StopPoint;
  arrival: StopPoint;
};

export type StopPoint = {
  name: string;
  code: string;
};

export type DefaultSNCFApiResponse = {
  regions?: unknown[];
  context?: unknown;
  links?: unknown[];
  message?: string;
};
