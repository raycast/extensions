import { Toast, showToast } from "@raycast/api";
import { disconnectNocalAccount, getAccessToken } from "./oauth";
import { getPreferences } from "./preferences";

export type NoteItem = {
  id: string;
  title: string;
  type: string;
  creation_date: string;
  last_modified_date: string;
  folder_id: string | null;
  folder_breadcrumbs: Array<{ id: string; name: string }>;
};

export type NoteSearchResult = {
  title_snippet: string | null;
  content_snippet: string | null;
  note: NoteItem;
};

export type EventConferencingDetails = {
  platform: string;
  join_url: string | null;
};

export type EventAttendee = {
  rsvp_status: string;
  is_self: boolean;
};

export type Event = {
  id: string;
  calendar: string;
  title: string | null;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  attendee_count: number;
  attendees: EventAttendee[];
  recurrence_summary: string | null;
  series: string | null;
  status: string;
  conferencing_details: EventConferencingDetails | null;
};

type PaginatedResponse<T> = {
  next: string | null;
  previous: string | null;
  results: T[];
};

export type NeedsRsvpItem = {
  event: Event;
  next_occurrence: string | null;
  conflicts: Event[];
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  searchParams?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function createUrl(path: string, searchParams?: RequestOptions["searchParams"]) {
  const { apiBaseUrl } = getPreferences();
  const url = new URL(path, `${apiBaseUrl}/`);

  for (const [key, value] of Object.entries(searchParams || {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function doFetch(path: string, options: RequestOptions, accessToken: string) {
  const url = createUrl(path, options.searchParams);
  return fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await doFetch(path, options, await getAccessToken());

  if (response.status === 401 || response.status === 403) {
    let errorDetail: string | undefined;
    try {
      const body = (await response.clone().json()) as { detail?: string };
      errorDetail = body.detail;
    } catch {
      /* ignore */
    }

    const isScopeError = errorDetail?.startsWith("Missing required scope");
    await showToast({
      style: Toast.Style.Animated,
      title: isScopeError ? errorDetail! : "Session expired",
      message: "Reconnecting your nocal account…",
    });
    await disconnectNocalAccount();
    response = await doFetch(path, options, await getAccessToken());
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorJson = (await response.json()) as {
        detail?: string;
        errors?: { detail?: string }[];
      };
      message = errorJson.detail || errorJson.errors?.[0]?.detail || message;
    } catch {
      // Fall back to the default message when the error body is not JSON.
    }

    throw new ApiError(message, response.status);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export async function searchNotes(query: string) {
  return await apiRequest<PaginatedResponse<NoteSearchResult>>("/notes/search/", {
    searchParams: {
      q: query,
      hide_marks: true,
      per_page: 20,
    },
  });
}

export async function createNote(input: { title: string; content: string }) {
  return await apiRequest<NoteItem & { content?: string }>("/notes/", {
    method: "POST",
    body: {
      title: input.title,
      content: input.content,
    },
  });
}

export async function listNeedsRsvp() {
  return await apiRequest<PaginatedResponse<NeedsRsvpItem>>("/calendars/primary/unresponded-rsvps/", {
    searchParams: { per_page: 50 },
  });
}

export async function rsvpToEvent(eventId: string, rsvpStatus: "ACCEPTED" | "DECLINED" | "TENTATIVE") {
  return await apiRequest<void>(`/events/${encodeURIComponent(eventId)}/rsvp/`, {
    method: "POST",
    body: { rsvp_status: rsvpStatus },
  });
}

export async function hideRsvpPrompt(eventId: string) {
  return await apiRequest<void>(`/events/${encodeURIComponent(eventId)}/`, {
    method: "PATCH",
    body: { mute_level: "MUTE_RSVP" },
  });
}

export async function listUpcomingMeetings() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  return await apiRequest<PaginatedResponse<Event>>("/calendars/primary/schedule/", {
    searchParams: {
      after: now.toISOString(),
      before: threeDaysFromNow.toISOString(),
      per_page: 20,
    },
  });
}
