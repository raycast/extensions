import { getPreferenceValues, LocalStorage } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import { isEmpty } from "lodash";

export interface Preferences {
  token: string;
  baseUrl?: string;
  defaultAction: "meeting" | "one-time";
}

export interface CalUser {
  id: number;
  username: string;
  name: string;
  email: string;
  emailVerified: string;
  bio: string;
  avatar: string;
  timeZone: string;
  weekStart: string;
  endTime: number;
  bufferTime: number;
  theme: null;
  defaultScheduleId: number;
  locale: string;
  timeFormat: number;
  brandColor: string;
  darkBrandColor: string;
  allowDynamicBooking: true;
  away: false;
  createdDate: string;
  verified: false;
  invitedTo: null;
}
interface CalUserResp {
  users: CalUser[];
}

export interface CalEventType {
  id: number;
  title: string;
  slug: string;
  description: string;
  position: number;
  locations: Array<unknown>;
  length: number;
  hidden: false;
  userId: null;
  teamId: null;
  eventName: null;
  timeZone: null;
  periodType: string;
  periodStartDate: string;
  periodEndDate: string;
  periodDays: null;
  periodCountCalendarDays: false;
  requiresConfirmation: false;
  recurringEvent: null;
  disableGuests: false;
  hideCalendarNotes: false;
  minimumBookingNotice: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  seatsPerTimeSlot: null;
  schedulingType: null;
  scheduleId: null;
  price: number;
  currency: string;
  slotInterval: null;
  metadata: object;
  successRedirectUrl: null;
}

interface CalEventTypeResp {
  event_types: CalEventType[];
}

const defaultBaseUrl = "https://api.cal.com/v1/";
const { token, baseUrl }: Preferences = getPreferenceValues();

const api = axios.create({
  baseURL: isEmpty(baseUrl) ? defaultBaseUrl : baseUrl,
  params: { apiKey: token },
});

async function calAPI<T>({ method = "GET", ...props }: AxiosRequestConfig) {
  const resp = await api.request<T>({ method, ...props });
  return resp.data;
}

async function getCurrentUser(): Promise<unknown> {
  const data = await calAPI<CalUserResp>({ url: "/users" });
  return data.users[0];
}

async function getEventTypes() {
  // const user = await getUserFromCache();
  const data = await calAPI<CalEventTypeResp>({ url: "/event-types" });
  console.log(data.event_types);
  return data.event_types;
}

export async function refreshData() {
  const user = await getCurrentUser();
  LocalStorage.setItem("user", JSON.stringify(user));
  const eventTypes = await getEventTypes();
  LocalStorage.setItem("eventTypes", JSON.stringify(eventTypes));
  LocalStorage.setItem("updated_ts", new Date().toISOString());
}

export async function getUserFromCache(): Promise<CalUser> {
  const cache = await LocalStorage.getItem("user");
  if (!cache) throw new Error("User not found in Cache");
  return JSON.parse(cache.toString());
}

export async function getEventTypesFromCache(): Promise<CalEventType[]> {
  const cache = await LocalStorage.getItem("eventTypes");
  if (!cache) throw new Error("Event Types not found in Cache");
  return JSON.parse(cache.toString());
}

// export async function createSingleUseLink(event: CalendlyEventType) {
//   const data = await calAPI<CalendlySingleUseLinkResponse>({
//     url: "/scheduling_links",
//     method: "POST",
//     data: { max_event_count: 1, owner: event.uri, owner_type: "EventType" },
//   });
//   return data.data.resource;
// }
