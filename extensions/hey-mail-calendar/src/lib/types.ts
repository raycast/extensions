export type HeyEnvelope<T> = {
  ok: boolean;
  data: T;
  summary?: string;
  breadcrumbs?: HeyBreadcrumb[];
};

export type HeyBreadcrumb = {
  action: string;
  command: string;
  description: string;
};

export type HeyAuthStatus = {
  authenticated: boolean;
  expired?: boolean;
  expires_at?: string;
  auth_type?: string;
  base_url?: string;
  refresh_available?: boolean;
  storage?: string;
};

export type HeyDoctorCheck = {
  name: string;
  status: string;
  message: string;
};

export type HeyBox = {
  id: number;
  kind: string;
  name: string;
  app_url: string;
};

export type HeyContact = {
  id: number;
  name: string;
  email_address: string;
  initials?: string;
};

export type HeyPosting = {
  id: number;
  name: string;
  summary: string;
  app_url: string;
  created_at: string;
  observed_at?: string;
  contacts: HeyContact[];
  creator?: HeyContact;
  alternative_sender_name?: string;
};

export type HeyBoxData = {
  box: HeyBox;
  postings: HeyPosting[];
};

export type HeyThreadEntry = {
  id: number;
  body: string;
  created_at: string;
  creator?: HeyContact;
  alternative_sender_name?: string;
};

export type HeyDraft = {
  id: number;
  name?: string;
  app_url: string;
  summary?: string;
  creator?: HeyContact;
  contacts?: HeyContact[];
};

export type HeyCalendar = {
  id: number;
  name?: string;
  color?: string;
  kind: string;
  personal?: boolean;
  owned?: boolean;
};

export type HeyRecording = {
  id: number;
  title: string;
  type: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color?: string;
  parent_id?: number;
  app_url?: string;
  icon_url?: string;
  days?: number[];
};

export type HeyRecordingsData = Record<string, HeyRecording[]>;

export type Preferences = {
  heyPath: string;
  habitsCalendarId?: string;
};

export function topicIdFromUrl(appUrl: string): string | undefined {
  const match = appUrl.match(/\/topics\/(\d+)/);
  return match?.[1];
}

export function isZeroDate(value: string | undefined): boolean {
  return !value || value.startsWith("0001-01-01");
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function senderName(posting: HeyPosting): string {
  return posting.alternative_sender_name || posting.creator?.name || posting.contacts[0]?.name || "Unknown";
}

export function plainTextBody(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\u2500+/g, "---")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
