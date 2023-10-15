import { getPreferenceValues } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import { useCachedPromise } from "@raycast/utils";

export interface Preferences {
  token: string;
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
  user: CalUser;
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
  recurringEvent: null | recurringEvent;
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

interface recurringEvent {
  freq: number;
  count: number;
  interval: number;
}

interface CalEventTypeResp {
  event_types: CalEventType[];
}

const defaultBaseUrl = "https://api.cal.com/v1/";
const { token }: Preferences = getPreferenceValues();

const api = axios.create({
  baseURL: defaultBaseUrl,
  params: { apiKey: token },
});

async function calAPI<T>({ method = "GET", ...props }: AxiosRequestConfig) {
  const resp = await api.request<T>({ method, ...props });
  return resp.data;
}

export function useCurrentUser() {
  return useCachedPromise(async () => {
    const data = await calAPI<CalUserResp>({ url: "/me" });
    return data.user;
  });
}

export function useEventTypes() {
  return useCachedPromise(async () => {
    const data = await calAPI<CalEventTypeResp>({ url: "/event-types" });
    return data.event_types;
  }, []);
}
