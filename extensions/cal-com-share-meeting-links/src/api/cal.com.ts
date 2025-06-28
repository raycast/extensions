import { getPreferenceValues } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import { useCachedPromise } from "@raycast/utils";
import moment from "moment";

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
  link: string;
}

interface recurringEvent {
  freq: number;
  count: number;
  interval: number;
}

interface CalEventTypeResp {
  event_types: CalEventType[];
}

export interface CalBookingResp {
  bookings: {
    id: number;
    userId: number;
    description: string;
    eventTypeId: number;
    uid: string;
    title: string;
    startTime: string;
    endTime: string;
    createdAt: string;
    attendees: {
      email: string;
      name: string;
      timeZone: string;
      locale: string;
    }[];
    user: {
      email: string;
      name: string;
      timeZone: string;
      locale: string;
    };
    payment: {
      id: number;
      success: boolean;
      paymentOption: string;
    }[];
    metadata: Record<string, unknown>;
    status: string;
    responses: {
      email: string;
      name: string;
      location: {
        optionValue: string;
        value: string;
      };
    };
  }[];
}

export interface updateBookingContent {
  status: string;
}

const defaultBaseUrl = "https://api.cal.com/v1/";
const { token } = getPreferenceValues<Preferences>();

const api = axios.create({
  baseURL: defaultBaseUrl,
  params: { apiKey: token },
});

async function calAPI<T>({ method = "GET", ...props }: AxiosRequestConfig) {
  const resp = await api.request<T>({ method, ...props });
  return resp.data;
}

export function useCurrentUser() {
  return useCachedPromise(
    async () => {
      const data = await calAPI<CalUserResp>({ url: "/me" });
      return data.user;
    },
    [],
    { failureToastOptions: { title: "Unable to load current user" } },
  );
}

export function useEventTypes() {
  return useCachedPromise(
    async () => {
      const data = await calAPI<CalEventTypeResp>({ url: "/event-types" });
      return data.event_types.sort((a, b) => b.position - a.position);
    },
    [],
    { failureToastOptions: { title: "Unable to load event types" } },
  );
}

export function useBookings() {
  return useCachedPromise(
    async () => {
      const data = await calAPI<CalBookingResp>({ url: "/bookings" });
      return data.bookings.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    },
    [],
    { failureToastOptions: { title: "Unable to load bookings" } },
  );
}

export function updateBooking(bookingId: number, data: updateBookingContent) {
  return calAPI({
    method: "PATCH",
    url: `/bookings/${bookingId}`,
    data,
  });
}

export function cancelBooking(bookingId: number, reason: string) {
  return calAPI({
    method: "DELETE",
    url: `/bookings/${bookingId}/cancel`,
    params: {
      cancellationReason: reason,
    },
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
