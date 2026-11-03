export type Resort = {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  /** Lowest lift/run point in metres. Missing when OpenSkiData has no mapped lifts or runs. */
  baseElevation?: number;
  /** Highest lift/run point in metres. */
  topElevation?: number;
  website?: string;
};
