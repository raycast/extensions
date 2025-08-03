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
  Accept: "*/*",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Dest": "empty",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Fetch-Mode": "cors",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: `${BASE_URL}/`,
  Priority: "u=3, i",
};

export async function fetchRoutes() {
  const res = await fetch(`${BASE_URL}/data/routes.txt?${Date.now()}`, { headers: HEADERS });
  return res.text();
}

export async function fetchStops() {
  const res = await fetch(`${BASE_URL}/data/stops.txt?${Date.now()}`, { headers: HEADERS });
  return res.text();
}

export async function fetchAnnouncements() {
  const res = await fetch(`${BASE_URL}/announcements.json?${Date.now()}`, { headers: HEADERS });
  return res.json();
}

export async function fetchDeparturesForStop(siriId: string) {
  const url = `${BASE_URL}/siri-stop-departures.php?stopid=${siriId}&time=${Date.now()}`;
  const res = await fetch(url, { headers: HEADERS });
  return res.text();
}
