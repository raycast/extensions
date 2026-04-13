import { getPreferenceValues } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import { useCachedPromise } from "@raycast/utils";
import moment from "moment";

export interface CalUser {
  id: number;
  username: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  timeZone: string;
  weekStart: string;
  timeFormat: number;
  defaultScheduleId: number | null;
  locale: string | null;
  organizationId: number | null;
  organization: {
    isPlatform: boolean;
    id: number;
  } | null;
}

export interface CalEventType {
  id: number;
  title: string;
  slug: string;
  description: string;
  locations: Array<unknown>;
  lengthInMinutes: number;
  hidden: boolean;
  ownerId: number | null;
  teamId: number | null;
  recurrence: null | Recurrence;
  confirmationPolicy: object | null;
  disableGuests: boolean;
  hideCalendarNotes: boolean;
  minimumBookingNotice: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  price: number;
  currency: string;
  metadata: object;
  bookingUrl: string;
}

interface Recurrence {
  frequency: string;
  occurrences: number;
  interval: number;
}

export interface CalBooking {
  id: number;
  uid: string;
  title: string;
  description: string;
  start: string;
  end: string;
  duration: number;
  createdAt: string;
  status: string;
  meetingUrl: string | null;
  location: string | null;
  hosts: {
    id: number;
    name: string;
    email: string;
    username: string;
    timeZone: string;
  }[];
  attendees: {
    email: string;
    name: string;
    timeZone: string;
    locale: string;
  }[];
  eventType: {
    id: number;
    slug: string;
  } | null;
  bookingFieldsResponses: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

interface CreatePrivateLinkResponse {
  linkId: string;
  eventTypeId: number;
  isExpired: boolean;
  bookingUrl: string;
  expiresAt: string;
}

export type CalWeekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export interface CalScheduleAvailability {
  days: CalWeekday[];
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface CalScheduleOverride {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface CalSchedule {
  id: number;
  ownerId: number;
  name: string;
  timeZone: string;
  isDefault: boolean;
  availability: CalScheduleAvailability[];
  overrides: CalScheduleOverride[];
}

export type CalSchedulePatch = Partial<
  Pick<CalSchedule, "name" | "timeZone" | "isDefault" | "availability" | "overrides">
>;

const { token } = getPreferenceValues<Preferences>();

const api = axios.create({
  baseURL: "https://api.cal.com/v2/",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

async function calAPI<T>({ method = "GET", ...props }: AxiosRequestConfig) {
  const resp = await api.request<{ status: string; data: T }>({ method, ...props });
  return resp.data.data;
}

export function useCurrentUser() {
  return useCachedPromise(
    async () => {
      return await calAPI<CalUser>({ url: "/me" });
    },
    [],
    { failureToastOptions: { title: "Unable to load current user" } },
  );
}

export function useEventTypes() {
  return useCachedPromise(
    async () => {
      return await calAPI<CalEventType[]>({
        url: "/event-types",
        headers: { "cal-api-version": "2024-06-14" },
      });
    },
    [],
    { failureToastOptions: { title: "Unable to load event types" } },
  );
}

export function useBookings() {
  return useCachedPromise(
    async () => {
      const data = await calAPI<CalBooking[]>({
        url: "/bookings",
        headers: { "cal-api-version": "2026-02-25" },
      });
      return data.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    },
    [],
    { failureToastOptions: { title: "Unable to load bookings" } },
  );
}

export function confirmBooking(bookingUid: string) {
  return calAPI({
    method: "POST",
    url: `/bookings/${bookingUid}/confirm`,
    headers: { "cal-api-version": "2026-02-25" },
  });
}

export function declineBooking(bookingUid: string, reason?: string) {
  return calAPI({
    method: "POST",
    url: `/bookings/${bookingUid}/decline`,
    headers: { "cal-api-version": "2026-02-25" },
    data: reason ? { reason } : undefined,
  });
}

export function cancelBooking(bookingUid: string, reason: string) {
  return calAPI({
    method: "POST",
    url: `/bookings/${bookingUid}/cancel`,
    headers: { "cal-api-version": "2026-02-25" },
    data: { cancellationReason: reason },
  });
}

export function createPrivateLinkForEventType(eventTypeId: number, signal: AbortSignal) {
  return calAPI<CreatePrivateLinkResponse>({
    method: "POST",
    url: `/event-types/${eventTypeId}/private-links`,
    headers: { "cal-api-version": "2024-09-04" },
    data: {
      maxUsageCount: 1,
    },
    signal,
  });
}

const SCHEDULES_API_VERSION = "2024-06-11";

export function useSchedules() {
  return useCachedPromise(
    async () => {
      return await calAPI<CalSchedule[]>({
        url: "/schedules",
        headers: { "cal-api-version": SCHEDULES_API_VERSION },
      });
    },
    [],
    { failureToastOptions: { title: "Unable to load schedules" } },
  );
}

export function updateSchedule(id: number, patch: CalSchedulePatch, signal?: AbortSignal) {
  return calAPI<CalSchedule>({
    method: "PATCH",
    url: `/schedules/${id}`,
    headers: { "cal-api-version": SCHEDULES_API_VERSION },
    data: patch,
    signal,
  });
}

export function formatDateTime(date: string) {
  return moment(date).format("Do MMM HH:mm a");
}

export function formatTime(date: string) {
  return moment(date).format("HH:mm a");
}

export function formatCurrency(price: number, currency: string) {
  return (price / 100).toLocaleString(undefined, {
    style: "currency",
    currency: currency,
    currencyDisplay: "narrowSymbol",
  });
}
