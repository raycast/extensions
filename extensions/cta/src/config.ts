import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  busApiKey: string;
  trainApiKey: string;
}

const preferences = getPreferenceValues<Preferences>();

export const CTA_BUS_API_KEY = preferences.busApiKey;
export const CTA_TRAIN_API_KEY = preferences.trainApiKey;

export const API_ENDPOINTS = {
  bus: {
    predictions: "http://www.ctabustracker.com/bustime/api/v2/getpredictions",
    routes: "http://www.ctabustracker.com/bustime/api/v2/getroutes",
    stops: "http://www.ctabustracker.com/bustime/api/v2/getstops",
    directions: "http://www.ctabustracker.com/bustime/api/v2/getdirections",
  },
  train: {
    arrivals: "http://lapi.transitchicago.com/api/1.0/ttarrivals.aspx",
    followThisTrain: "http://lapi.transitchicago.com/api/1.0/ttfollow.aspx",
  },
};

export interface BusRoute {
  rt: string;
  rtnm: string;
  rtclr: string;
}

export interface BusPrediction {
  stpid: string;
  stpnm: string;
  vid: string;
  dstp: number;
  rt: string;
  rtdd: string;
  rtdir: string;
  des: string;
  prdtm: string;
  tablockid: string;
  tatripid: string;
  dly: boolean;
  prdctdn: string;
  zone: string;
}

export interface TrainArrival {
  staId: string;
  stpId: string;
  staNm: string;
  stpDe: string;
  rn: string;
  rt: string;
  destNm: string;
  arrT: string;
  isApp: string;
  isSch: string;
  isDly: string;
  isFlt: string;
  flags: string;
  lat: string;
  lon: string;
  heading: string;
}

export type TransitType = "bus" | "train";

export const TRAIN_LINES = {
  RED: "Red",
  BLUE: "Blue",
  BROWN: "Brn",
  GREEN: "G",
  ORANGE: "Org",
  PURPLE: "P",
  PINK: "Pink",
  YELLOW: "Y",
} as const;

export interface BusDirection {
  dir: string;
}

export interface BusStop {
  stpid: string;
  stpnm: string;
  lat: number;
  lon: number;
}
