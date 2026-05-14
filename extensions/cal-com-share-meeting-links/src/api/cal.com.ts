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
  /** Schedule this event type uses; null means "user's default schedule". */
  scheduleId: number | null;
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

const BOOKINGS_API_VERSION = "2026-02-25";

interface BookingsListParams {
  status: "upcoming" | "unconfirmed" | "past" | "cancelled" | "recurring";
  sortStart: "asc" | "desc";
  take: number;
  skip?: number;
}

async function fetchBookings(params: BookingsListParams): Promise<CalBooking[]> {
  return calAPI<CalBooking[]>({
    url: "/bookings",
    headers: { "cal-api-version": BOOKINGS_API_VERSION },
    params,
  });
}

async function fetchPendingBookings(): Promise<CalBooking[]> {
  return fetchBookings({ status: "unconfirmed", sortStart: "asc", take: 100 });
}

async function fetchUpcomingBookings(): Promise<CalBooking[]> {
  return fetchBookings({ status: "upcoming", sortStart: "asc", take: 100 });
}

async function fetchCancelledBookings(): Promise<CalBooking[]> {
  return fetchBookings({ status: "cancelled", sortStart: "desc", take: 50 });
}

const PAST_PAGE_SIZE = 50;

// Inner paginator hoisted to a stable module-level reference. Raycast's paginated
// useCachedPromise calls this with `{ page, lastItem?, cursor? }` (PaginationOptions).
async function fetchPastBookingsPage({ page }: { page: number }): Promise<{ data: CalBooking[]; hasMore: boolean }> {
  const data = await fetchBookings({
    status: "past",
    sortStart: "desc",
    take: PAST_PAGE_SIZE,
    skip: page * PAST_PAGE_SIZE,
  });
  return { data, hasMore: data.length === PAST_PAGE_SIZE };
}

// Curried wrapper matching Raycast's `FunctionReturningPaginatedPromise` shape:
//   `(...args) => (paginationOptions) => Promise<{ data, hasMore }>`.
// The OUTER reference (fetchPastBookingsPaginator) is stable across renders, so
// useCachedPromise's cache namespace (derived from object_hash(fn)) stays consistent.
function fetchPastBookingsPaginator() {
  return fetchPastBookingsPage;
}

export function usePendingBookings() {
  return useCachedPromise(fetchPendingBookings, [], {
    failureToastOptions: { title: "Unable to load pending bookings" },
  });
}

export function useUpcomingBookings() {
  return useCachedPromise(fetchUpcomingBookings, [], {
    failureToastOptions: { title: "Unable to load upcoming bookings" },
  });
}

/**
 * Fetches cancelled bookings. Pass `execute=false` to skip the network call
 * (used when the Cancelled section is hidden).
 */
export function useCancelledBookings(execute: boolean) {
  return useCachedPromise(fetchCancelledBookings, [], {
    execute,
    failureToastOptions: { title: "Unable to load cancelled bookings" },
  });
}

export function usePastBookings() {
  return useCachedPromise(fetchPastBookingsPaginator, [], {
    failureToastOptions: { title: "Unable to load past bookings" },
  });
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

/**
 * Requests an attendee to reschedule a booking. Per Cal.com docs, this cancels
 * the original booking and emails the attendee a link to pick a new time.
 */
export function requestRescheduleBooking(bookingUid: string, reason: string) {
  return calAPI({
    method: "POST",
    url: `/bookings/${bookingUid}/request-reschedule`,
    headers: { "cal-api-version": "2026-02-25" },
    data: { rescheduleReason: reason },
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
// Verified during manual QA on 2026-04-13:
//   OOO_BASE_PATH      = "/me/ooo"            ("/out-of-office" 404s — use the /me variant)
//   OOO_API_VERSION    = "2024-06-14"
//   END_OF_DAY_FORMAT  = next-day-00:00:00Z   (assumed; verify on first successful create)

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
    url: "/me/ooo",
    headers: { "cal-api-version": OOO_API_VERSION },
  });
  // Normalize embedded toUser avatar URLs (Cal.com sometimes returns relative `/api/avatar/...` paths).
  const normalized = data.map((e) =>
    e.toUser ? { ...e, toUser: { ...e.toUser, avatarUrl: normalizeAvatarUrl(e.toUser.avatarUrl) } } : e,
  );
  // The "Out of Office" command intentionally surfaces only current + upcoming
  // entries — past entries are noise for the day-to-day "schedule my next
  // vacation" flow and matched cal.com's own web UI behavior at design time.
  // Cal.com's `/me/ooo` endpoint currently returns past entries too, so we filter
  // client-side. If a "Show Past" toggle is added later, this filter should move
  // up to the consumer or be replaced with a server-side `status` param if v2
  // adds one for OOO.
  const now = Date.now();
  return normalized
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
    url: "/me/ooo",
    headers: { "cal-api-version": OOO_API_VERSION },
    data: input,
    signal,
  });
}

export function updateOOO(id: number, patch: CalOOOPatch, signal?: AbortSignal) {
  return calAPI<CalOOOEntry>({
    method: "PATCH",
    url: `/me/ooo/${id}`,
    headers: { "cal-api-version": OOO_API_VERSION },
    data: patch,
    signal,
  });
}

export function deleteOOO(id: number, signal?: AbortSignal) {
  return calAPI<void>({
    method: "DELETE",
    url: `/me/ooo/${id}`,
    headers: { "cal-api-version": OOO_API_VERSION },
    signal,
  });
}

// ─── Team members (for OOO redirect target) ────────────────────────────────

const TEAMS_API_VERSION = "2024-08-13";

interface CalTeamSummary {
  id: number;
  name: string;
}

export interface CalTeammate {
  id: number;
  name: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
  teamName: string; // for display context
}

async function fetchTeams(): Promise<CalTeamSummary[]> {
  try {
    return await calAPI<CalTeamSummary[]>({
      url: "/teams",
      headers: { "cal-api-version": TEAMS_API_VERSION },
    });
  } catch (err) {
    console.error("[OOO] fetchTeams failed:", err);
    return [];
  }
}

interface MembershipResponseUser {
  name: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
}

interface MembershipResponse {
  /** Membership row id (NOT the user's id). */
  id: number;
  /** The actual user id we want. */
  userId: number;
  user: MembershipResponseUser;
}

/**
 * Cal.com returns avatar paths as either absolute URLs or relative `/api/avatar/...` paths.
 * For Cal.com-hosted images, request a small thumbnail via `?size=32` (the API serves any size).
 * Other hosts (e.g. Google) are returned as-is.
 */
function normalizeAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/api/avatar/")) {
    return `https://app.cal.com${url}?size=32`;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `https://app.cal.com${url}`;
  return url;
}

async function fetchTeamMembers(teamId: number, teamName: string): Promise<CalTeammate[]> {
  try {
    const memberships = await calAPI<MembershipResponse[]>({
      url: `/teams/${teamId}/memberships`,
      headers: { "cal-api-version": TEAMS_API_VERSION },
    });
    return memberships.map((m) => ({
      id: m.userId,
      name: m.user.name,
      username: m.user.username,
      email: m.user.email,
      avatarUrl: normalizeAvatarUrl(m.user.avatarUrl),
      teamName,
    }));
  } catch (err) {
    console.error(`[OOO] fetchTeamMembers(${teamName}) failed:`, err);
    return [];
  }
}

async function fetchAllTeammates(): Promise<CalTeammate[]> {
  // Fetch current user (to exclude from results) and teams in parallel.
  const [meResult, teams] = await Promise.all([calAPI<CalUser>({ url: "/me" }).catch(() => null), fetchTeams()]);
  const meId = meResult?.id;

  if (teams.length === 0) return [];
  const lists = await Promise.all(teams.map((t) => fetchTeamMembers(t.id, t.name)));
  const merged = lists.flat();
  // De-duplicate by user id, exclude self, keep first-seen team name.
  const seen = new Set<number>();
  const out: CalTeammate[] = [];
  for (const t of merged) {
    if (t.id === meId) continue; // exclude self
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out.sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
}

export function useTeammates() {
  return useCachedPromise(fetchAllTeammates, [], {
    failureToastOptions: { title: "Unable to load teammates" },
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
