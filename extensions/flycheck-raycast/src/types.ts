export interface Preferences {
  apiKey: string;
}

export interface ParsedMetar {
  flightCategory: string;
  wind?: string;
  visibility?: string;
  temperature?: string;
  dewpoint?: string;
  altimeter?: string;
}
