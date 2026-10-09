import { getPreferenceValues } from "@raycast/api";

const DEFAULT_BASE = "https://meet.gaurifyhq.com";

export type Me = {
  id: string;
  name: string;
  slug: string;
  tz: string;
  pageUrl: string;
  verified: boolean;
};

export type Booking = {
  id: string;
  start_utc: string;
  end_utc: string;
  duration_min: number;
  mode: "meet" | "phone" | string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  note: string | null;
  meet_url: string | null;
  event_type_id: string | null;
  type_title: string | null;
  team_title: string | null;
  amount: number | null;
  currency: string | null;
  payment_status: string | null;
};

export type BookingDetail = Booking & {
  location: "google_meet" | "phone" | "link" | "video";
  guest_tz: string | null;
  answers: { label: string; value: string }[];
  event_type: { id: string; name: string; slug: string } | null;
  manage_url: string | null;
  status: "upcoming" | "past";
};

export type EventType = {
  id: string;
  name: string;
  slug: string;
  duration_min: number;
  mode: string;
  location: "google_meet" | "phone" | "link" | "video";
  price: { amount: number; currency: string } | null;
  secret: boolean;
  seats: number;
};

export type Availability = { slots: string[]; local: string[]; tz: string; error?: string };

export type NewBooking = {
  start: string;
  duration: number;
  name: string;
  email: string;
  note?: string;
  eventType?: string;
  tz?: string;
};

export type Created = {
  ok: true;
  id: string;
  start: string;
  end: string;
  title: string;
  meetUrl: string | null;
  mode: string;
};

/** A missing, wrong or revoked key. Shown as "Add your API key", never as a crash. */
export class AuthError extends Error {
  constructor() {
    super("Add your API key");
    this.name = "AuthError";
  }
}

export function baseUrl(): string {
  const { baseUrl } = getPreferenceValues<Preferences>();
  const raw = (baseUrl || "").trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(raw) ? raw : DEFAULT_BASE;
}

export function appUrl(view = "home"): string {
  return `${baseUrl()}/app/#${view}`;
}

export const KEYS_URL = () => appUrl("developers");

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const key = (apiKey || "").trim();
  if (!/^gm_live_[A-Za-z0-9_-]+$/.test(key)) throw new AuthError();
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  } catch {
    throw new Error("Can't reach Gaurify Meet. Check your connection.");
  }
  if (res.status === 401) throw new AuthError();
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error || `Gaurify Meet said ${res.status}. Try again.`);
  return body as T;
}

export const getMe = () => call<Me>("/api/v1/me");

/**
 * Meetings that have not ended yet, soonest first. status=all is used (not upcoming) so a
 * meeting already in progress still shows, with its Join action.
 */
export async function getUpcoming(): Promise<Booking[]> {
  const { bookings } = await call<{ now: string; bookings: Booking[] }>("/api/v1/bookings?status=all");
  const now = Date.now();
  return bookings.filter((b) => Date.parse(b.end_utc) > now).sort((a, b) => a.start_utc.localeCompare(b.start_utc));
}

export const getBooking = (id: string) => call<BookingDetail>(`/api/v1/bookings/${encodeURIComponent(id)}`);

export const cancelBooking = (id: string, reason?: string) =>
  call<{ ok: true; refunded?: boolean }>(`/api/v1/bookings/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {}),
  });

export async function getEventTypes(): Promise<EventType[]> {
  const { event_types } = await call<{ event_types: EventType[] }>("/api/v1/event-types");
  return event_types;
}

export async function getAvailability(opts: {
  type?: string;
  duration?: number;
  days?: number;
}): Promise<Availability> {
  const tz = viewerTz();
  const from = ymd(new Date(), tz);
  const to = ymd(new Date(Date.now() + (opts.days ?? 14) * 86400e3), tz);
  const q = new URLSearchParams({ from, to, tz });
  if (opts.type) q.set("type", opts.type);
  else q.set("duration", String(opts.duration ?? 30));
  return call<Availability>(`/api/v1/availability?${q}`);
}

export const createBooking = (b: NewBooking) =>
  call<Created>("/api/v1/bookings", { method: "POST", body: JSON.stringify(b) });

export function viewerTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function ymd(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    d,
  );
}

export function typeLink(me: Me, t: EventType): string {
  return `${me.pageUrl}/${t.slug}`;
}
