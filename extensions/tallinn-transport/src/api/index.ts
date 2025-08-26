import axios from "axios";

const BASE_URL = "https://transport.tallinn.ee";

export type RouteBase = {
  RouteNum: string;
  RouteType: string;
  RouteName: string;
  Transport: string;
  RouteStops: string;
};

export type RouteTimes = {
  RouteNum: string;
};

export type RouteRaw = RouteBase | RouteTimes;

export type StopRaw = {
  ID: string;
  SiriID: string;
  Name: string;
  Stops: string;
  Lat: string;
  Lng: string;
};

export type DepartureRaw = {
  Transport: string;
  RouteNum: string;
  ExpectedTimeInSeconds: string;
  ScheduleTimeInSeconds: string;
  version20201024: string;
  [key: string]: string;
};

export type AnnouncementRaw = {
  transport: string;
  routes: string;
  stops: string;
  info: string;
  stop_codes: string;
  publication_start_time: string;
  publication_end_time: string;
  valid_start_time: string;
  valid_end_time: string | null;
  title: string;
};

export const HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "en-US,en;q=0.8",
  Connection: "keep-alive",
  Host: "transport.tallinn.ee",
  "sec-ch-ua": '"Not;A=Brand";v="99", "Brave";v="139", "Chromium";v="139"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Sec-GPC": "1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
};

export async function fetchRoutes() {
  const res = await axios.get(`${BASE_URL}/data/routes.txt?1756195200000`, { headers: HEADERS });
  return res.data;
}

export async function fetchStops() {
  const res = await axios.get(`${BASE_URL}/data/stops.txt?${Date.now()}`, { headers: HEADERS });
  return res.data;
}

export async function fetchAnnouncements() {
  const res = await axios.get(`${BASE_URL}/announcements.json?${Date.now()}`, { headers: HEADERS });
  return res.data;
}

export async function fetchDeparturesForStop(siriId: string) {
  const url = `${BASE_URL}/siri-stop-departures.php?stopid=${siriId}&time=${Date.now()}`;
  const res = await axios.get(url, { headers: HEADERS });
  return res.data;
}
