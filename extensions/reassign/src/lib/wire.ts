// Public wire contract for the Reassign REST API (/api/v1).
// This repo becomes public and cannot import the private server code.
// So the small, stable contract lives here. Branch on `code`, never on prose.

export const WEB_BASE = "https://reassign.app";
export const API_BASE = `${WEB_BASE}/api/v1`;
export const CLIENT_ID = "reassign-raycast";
export const OAUTH_RESOURCE = API_BASE;
export const AUTHORIZE_URL = `${WEB_BASE}/api/oauth/authorize`;
export const TOKEN_URL = `${WEB_BASE}/api/oauth/token`;
export const SCOPES = "events:read events:write";
export const RAYCAST_REDIRECT = "https://raycast.com/redirect?packageName=Extension";

/** The upgrade page shown for the Pro-gate. */
export const BILLING_URL = `${WEB_BASE}/settings/billing`;

/**
 * Deep link to a day in the web app. Pass an event id to open that event —
 * the dial reads `?event=<id>` on load and opens the event editor.
 */
export function webDayUrl(dateISO: string, eventId?: string): string {
  const base = `${WEB_BASE}/${dateISO}`;
  return eventId ? `${base}?event=${encodeURIComponent(eventId)}` : base;
}

// Full refusal-code vocabulary. Only `permission` triggers the Pro upsell.
export type ErrorCode =
  | "unauthorized"
  | "permission"
  | "scope"
  | "read_only"
  | "not_found"
  | "validation"
  | "conflict"
  | "batch_rejected"
  | "rate_limited"
  | "internal";

// Server text limits (characters). A longer value is a 422, so check first.
export const MAX_NAME_LENGTH = 200;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_FEEDBACK_LENGTH = 4000;

export const PATHS = {
  schedule: "/schedule",
  events: "/events",
  eventsSearch: "/events/search",
  schedulePlan: "/schedule/plan",
  scheduleConfirm: "/schedule/confirm",
  actionsUndo: "/actions/undo",
  backlog: "/backlog",
  calendars: "/calendars",
  feedback: "/feedback",
} as const;
