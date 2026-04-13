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

// Hoisted so every `useSchedules` call shares the SAME function reference.
// useCachedPromise namespaces its cache by the function's hash; two inline
// arrow functions can hash differently, which would split the cache between
// callers (e.g. ViewAvailability vs. ScheduleDetail) and break propagation.
async function fetchSchedules(): Promise<CalSchedule[]> {
  const data = await calAPI<CalSchedule[]>({
    url: "/schedules",
    headers: { "cal-api-version": SCHEDULES_API_VERSION },
  });
  // Default schedule first, otherwise preserve API order.
  return [...data].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

export function useSchedules() {
  return useCachedPromise(fetchSchedules, [], { failureToastOptions: { title: "Unable to load schedules" } });
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

// ─── Out of Office ─────────────────────────────────────────────────────────
//
// Defaults — verified during manual QA, may need adjustment:
//   OOO_BASE_PATH      = "/out-of-office"
//   OOO_API_VERSION    = "2024-06-14"
//   END_OF_DAY_FORMAT  = next-day-00:00:00Z
// If `GET /v2/out-of-office` 404s, try "/me/ooo" instead.

const OOO_API_VERSION = "2024-06-14";

export type CalOOOReason = "unspecified" | "vacation" | "travel" | "sick" | "public_holiday";

export interface CalOOOToUser {
  id: number;
  name: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface CalOOOEntry {
  id: number;
  uuid: string;
  userId: number;
  start: string; // ISO datetime UTC
  end: string; // ISO datetime UTC
  reason: CalOOOReason;
  notes: string | null;
  toUserId: number | null;
  toUser?: CalOOOToUser | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalOOOCreate {
  start: string;
  end: string;
  reason?: CalOOOReason;
  notes?: string;
  toUserId?: number;
}

export type CalOOOPatch = Partial<CalOOOCreate>;

// Hoisted to share useCachedPromise's cache namespace across callers.
async function fetchOOOEntries(): Promise<CalOOOEntry[]> {
  const data = await calAPI<CalOOOEntry[]>({
    url: "/out-of-office",
    headers: { "cal-api-version": OOO_API_VERSION },
  });
  // Filter past entries client-side (in case the API returns them) and sort ascending by start.
  const now = Date.now();
  return data
    .filter((e) => new Date(e.end).getTime() >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function useOOOEntries() {
  return useCachedPromise(fetchOOOEntries, [], {
    failureToastOptions: { title: "Unable to load out-of-office entries" },
  });
}

export function createOOO(input: CalOOOCreate, signal?: AbortSignal) {
  return calAPI<CalOOOEntry>({
    method: "POST",
    url: "/out-of-office",
    headers: { "cal-api-version": OOO_API_VERSION },
    data: input,
    signal,
  });
}

export function updateOOO(id: number, patch: CalOOOPatch, signal?: AbortSignal) {
  return calAPI<CalOOOEntry>({
    method: "PATCH",
    url: `/out-of-office/${id}`,
    headers: { "cal-api-version": OOO_API_VERSION },
    data: patch,
    signal,
  });
}

export function deleteOOO(id: number, signal?: AbortSignal) {
  return calAPI<void>({
    method: "DELETE",
    url: `/out-of-office/${id}`,
    headers: { "cal-api-version": OOO_API_VERSION },
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
