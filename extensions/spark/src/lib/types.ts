// Shapes of `spark <command> --json`. Keys are snake_case, dates are ISO 8601
// strings, and optional fields are left out rather than null. The CLI only
// ever adds fields, so these list what the extension uses.
//
// No Raycast imports here: this file runs under `node --test` as-is.

export interface Page {
  page: number;
  total_pages: number;
  total_count: number;
  /// The listing was capped, so the totals are a lower bound.
  has_more: boolean;
}

export interface Address {
  name?: string;
  email: string;
}

export type AccessLevel = "read-only" | "triage" | "send";

// MARK: - accounts

export interface AccountsResult {
  accounts: Account[];
}

export interface Account {
  email: string;
  title?: string;
  /// "disabled" when only a shared inbox of the account is granted.
  access: AccessLevel | "disabled";
  aliases: Address[];
  calendars: { title: string; identifier: string; access: "read-write" | "read-only" }[];
  teams: { name: string; shared_inboxes: { email: string; access: AccessLevel; color?: string }[] }[];
  /// "#RRGGBB" when color coding is on in Spark and the account has a color.
  color?: string;
}

// MARK: - folders

export interface FoldersResult {
  sections: FolderSection[];
}

export interface FolderSection {
  kind: "unified" | "account" | "shared_inbox";
  /// Absent for the unified section.
  email?: string;
  uses_gmail_labels: boolean;
  excludes_shared_inboxes: boolean;
  /// System folders first, in Spark's order, then custom folders by name.
  folders: { name: string; identifier: string; message_count: number }[];
}

// MARK: - emails / search

export type EmailFlag = "unread" | "starred" | "attachment" | "draft" | "snoozed" | "replied" | "opened" | "not opened";

export interface EmailSummary {
  id: number;
  account?: string;
  from: Address[];
  date?: string;
  /// For a team comment, the comment text.
  subject?: string;
  is_comment: boolean;
  flags: EmailFlag[];
}

/// `emails`, and `search` without a topic.
export interface EmailsResult {
  scope: string;
  filter?: string;
  emails: EmailSummary[];
  page: Page;
  new_sender_count?: number;
  new_sender_emails?: string[];
}

/// `search <topic>`.
export interface SearchResult {
  about: string;
  scope: string;
  filter?: string;
  semantic_available: boolean;
  matches: SearchMatch[];
  plan_limitation_message?: string;
}

export interface SearchMatch {
  outside_plan_range: boolean;
  from: Address[];
  /// Everything below is absent when `outside_plan_range` is true.
  id?: number;
  subject?: string;
  to?: Address[];
  date?: string;
  flags?: EmailFlag[];
  body?: string;
  body_unavailable?: boolean;
}

// MARK: - thread / attachment

export type MessageType = "Email" | "Shared Email" | "Draft" | "Shared Draft" | "Chat Message";

export interface ThreadResult {
  subject?: string;
  labels: string[];
  link?: string;
  shared_with: Address[];
  assigned_by: Address[];
  assigned_to: Address[];
  messages: ThreadMessage[];
}

export interface ThreadMessage {
  id: number;
  type: MessageType;
  subject?: string;
  from: Address[];
  reply_to: Address[];
  to: Address[];
  cc: Address[];
  bcc: Address[];
  date?: string;
  flags: EmailFlag[];
  body: string;
  attachments: AttachmentSummary[];
}

export interface AttachmentSummary {
  id: number;
  name: string;
  size: number;
  mime_type: string;
  path?: string;
}

export interface AttachmentResult extends AttachmentSummary {
  path: string;
  message_id: number;
}

// MARK: - events / event / availability

export type AttendeeStatus = "accepted" | "declined" | "maybe" | "pending";

export interface CalendarEvent {
  id: string;
  title?: string;
  start: string;
  end: string;
  all_day: boolean;
  calendar?: { title: string; identifier?: string };
  location?: string;
  conference_url?: string;
  alerts: { seconds_before?: number; date?: string }[];
  organizer?: Address;
  attendees: (Address & { status: AttendeeStatus })[];
  /// The user's own answer, only on invitations they can answer.
  attending_status?: AttendeeStatus;
  meeting_transcript_id?: number;
  /// Description, as markdown.
  notes?: string;
}

export interface EventsResult {
  start: string;
  end: string;
  events: CalendarEvent[];
}

export interface EventResult {
  action: "created" | "updated" | "deleted" | "rsvp";
  event_id?: string;
  message_id?: number;
  rsvp?: "accepted" | "declined" | "maybe";
  already_set?: boolean;
  attendee_changes?: { added: string[]; removed: string[] };
}

export interface AvailabilityResult {
  start: string;
  end: string;
  checked_attendees: string[];
  unchecked_attendees: string[];
  free_slots: { start: string; end: string }[];
}

// MARK: - contacts

export interface ContactsResult {
  /// Null when listing the most-used contacts.
  query: string | null;
  match: "strict" | "fuzzy" | "top";
  contacts: Address[];
}

export interface ContactActionResult {
  action: string;
  contacts: { email: string; status: "done" | "failed" }[];
}

/// `contact <email>`: one contact and each setting `contact-action` changes.
export interface ContactResult {
  email: string;
  name?: string;
  other_emails: string[];
  /// Spark's cached photo on disk; absent when none is cached.
  avatar_path?: string;
  category?: "personal" | "notification" | "newsletter";
  is_priority: boolean;
  notifications: boolean;
  /// GateKeeper. Neither is set for a new sender still in the queue.
  blocked: boolean;
  accepted: boolean;
  grouped: boolean;
  /// When grouped: whether the group shows in the Inbox rather than by category.
  grouped_in_inbox?: boolean;
  auto_summary: boolean;
}

// MARK: - meetings

export interface MeetingsResult {
  filter?: string;
  meetings: { id: number; title?: string; date?: string; duration_seconds?: number }[];
  page: Page;
}

export interface MeetingResult {
  title?: string;
  date?: string;
  end_date?: string;
  participants: Address[];
  link?: string;
  /// Absent when the content couldn't be loaded; "" when there is none.
  summary?: string;
  transcript?: string;
  notes?: string;
}

// MARK: - templates

export interface TemplatesResult {
  templates: { id: number; scope: string; name: string; subject?: string; modified: string }[];
  page: Page;
}

export interface TemplateResult {
  id: number;
  name: string;
  scope: string;
  subject?: string;
  body?: string;
  placeholders: { name: string; kind: "auto" | "manual"; is_required: boolean; current_value?: string }[];
}

// MARK: - draft / action

export interface DraftResult {
  action: "created" | "updated" | "shared" | "unshared";
  id: number;
  link?: string;
  subject?: string;
  unresolved_placeholders: string[];
}

export type ActionStatus =
  "done" | "sent" | "scheduled" | "rescheduled" | "sent_now" | "skipped" | "refused" | "failed";

export interface ActionResult {
  action: string;
  messages: { id: string; status: ActionStatus; reason?: string; message_id?: number }[];
  scheduled_for?: string;
}

/// What Spark answers instead of a result when it holds a command that sends
/// mail or invites: it runs after an undo countdown, or only once the user
/// approves it in Spark Desktop. `message` says which, in Spark's words.
export interface HeldReply {
  message: string;
}

export function isHeld(value: unknown): value is HeldReply {
  if (typeof value !== "object" || value === null) return false;
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === "message" && typeof (value as HeldReply).message === "string";
}

// MARK: - Helpers

export function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/// "Bob Smith" or "bob@acme.io".
export function displayName(address: Address | undefined): string {
  return address?.name?.trim() || address?.email || "";
}

/// "Bob Smith <bob@acme.io>" or "bob@acme.io".
export function formatAddress(address: Address): string {
  const name = address.name?.trim();
  return name ? `${name} <${address.email}>` : address.email;
}

export function formatAddresses(addresses: Address[]): string {
  return addresses.map(formatAddress).join(", ");
}

/// Converts the `link` a result carries into the app's own URL scheme, so it
/// opens Spark directly instead of going through the browser.
export function appLink(link: string): string {
  const token = link.match(/[?&]token=([^&\s]+)/)?.[1];
  return token ? `readdle-spark://bl=${token}` : link;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatDuration(seconds: number | undefined): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

const SUCCEEDED: ActionStatus[] = ["done", "sent", "scheduled", "rescheduled", "sent_now"];

export interface ActionOutcome {
  succeeded: number;
  total: number;
  /// Every per-message problem, e.g. `12: account does not have triage access`.
  problems: string[];
  refused: boolean;
}

/// Partial failures come back as success with a status per message, so the
/// statuses are what tells the user whether the action worked.
export function actionOutcome(result: ActionResult): ActionOutcome {
  const failed = result.messages.filter((m) => !SUCCEEDED.includes(m.status));
  return {
    succeeded: result.messages.length - failed.length,
    total: result.messages.length,
    problems: failed.map((m) => (m.reason ? `${m.id}: ${m.reason}` : `${m.id}: ${m.status}`)),
    refused: failed.some((m) => m.status === "refused"),
  };
}
