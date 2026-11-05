// The attendee list typed into Find Free Time's search bar: finished email
// addresses, plus the word still being typed, which is looked up in contacts.
//
// No Raycast imports here: this file runs under `node --test` as-is.

export const EMAIL = /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/;

export interface Attendees {
  /// Complete addresses, in order, without duplicates.
  emails: string[];
  /// The last word when it isn't a complete address yet ("ale", "alex@co").
  partial: string;
}

export function parseAttendees(text: string): Attendees {
  const tokens = text.split(/[,;\s]+/).filter(Boolean);
  // A trailing separator means the last word is finished.
  const typing = tokens.length > 0 && !/[,;\s]$/.test(text);
  const last = typing ? tokens[tokens.length - 1] : "";
  const partial = last && !EMAIL.test(last) ? last : "";
  const done = partial ? tokens.slice(0, -1) : tokens;
  const emails = [...new Set(done.filter((t) => EMAIL.test(t)).map((t) => t.toLowerCase()))];
  return { emails, partial };
}

/// Replaces the word being typed with `email`, ready for the next attendee.
export function pickAttendee(text: string, email: string): string {
  const { emails } = parseAttendees(text);
  return [...emails.filter((e) => e !== email.toLowerCase()), email].join(", ") + ", ";
}
