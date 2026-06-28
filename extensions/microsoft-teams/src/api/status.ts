import { bodyOf, failIfNotOk, get, post } from "./api";
import { DateTime } from "luxon";

const PINNED_NOTE = "<pinnednote></pinnednote>";

// https://learn.microsoft.com/en-us/graph/api/resources/datetimetimezone
interface NativeStatus {
  message?: {
    contentType: "text";
    content: string | null;
  };
  expiryDateTime?: {
    dateTime: string | null; // "2019-04-16T09:00:00"
    timeZone?: string;
  };
}

// Shape of the statusMessage carried on the presence resource (GET /me/presence).
interface NativePresence {
  statusMessage?: {
    message?: { content?: string | null };
    expiryDateTime?: { dateTime?: string | null; timeZone?: string };
    publishedDateTime?: string | null;
  };
}

export interface Status {
  message: string | null; // text, pinned marker stripped; null if no status
  expiry: string | null; // absolute ISO timestamp; null = no expiry
  published: string | null; // absolute ISO timestamp, when set (read-only)
}

async function postStatus(status: NativeStatus) {
  const response = await post({
    apiVersion: "beta",
    path: "/me/presence/setStatusMessage",
    body: {
      statusMessage: status,
    },
  });
  await failIfNotOk(response, "Setting status");
}

export async function setStatus(message: string, pinned = false, expiry?: Date | null) {
  await postStatus({
    message: {
      contentType: "text",
      content: message + (pinned ? PINNED_NOTE : ""),
    },
    // Omit expiryDateTime entirely when there is no expiry: per Microsoft Graph,
    // a status without expiryDateTime never expires.
    expiryDateTime: expiry
      ? {
          dateTime: DateTime.fromJSDate(expiry).toUTC().toISO({ includeOffset: false }),
          timeZone: "UTC",
        }
      : undefined,
  });
}

export async function clearStatus() {
  await postStatus({
    message: {
      contentType: "text",
      content: null,
    },
  });
}

function toIsoTimestamp(dateTime: string, timeZone?: string): string | null {
  // Interpret with the provided zone if luxon understands it (e.g. "UTC" or an
  // IANA name); otherwise fall back to UTC. Statuses set through this extension
  // are always written in UTC, so this is exact for them; only a status set
  // externally (Teams app) with an unrecognized Windows zone name could be off
  // by its offset — acceptable for an AI-only tool.
  let parsed = DateTime.fromISO(dateTime, { zone: timeZone ?? "utc" });
  if (!parsed.isValid) {
    parsed = DateTime.fromISO(dateTime, { zone: "utc" });
  }
  // Treat invalid dates and the legacy year-9999 "never" sentinel as no expiry.
  if (!parsed.isValid || parsed.year >= 9999) {
    return null;
  }
  return parsed.toISO();
}

export async function getStatus(): Promise<Status> {
  const response = await get({ path: "/me/presence" });
  await failIfNotOk(response, "Getting status");
  const presence = await bodyOf<NativePresence>(response);
  const statusMessage = presence.statusMessage;

  const rawContent = statusMessage?.message?.content ?? null;
  // Defensively strip the pinned marker so the text is clean.
  const message = rawContent ? rawContent.replaceAll(PINNED_NOTE, "") || null : null;

  const expiryDateTime = statusMessage?.expiryDateTime;
  const expiry = expiryDateTime?.dateTime ? toIsoTimestamp(expiryDateTime.dateTime, expiryDateTime.timeZone) : null;

  const published = statusMessage?.publishedDateTime ?? null;

  return { message, expiry, published };
}
