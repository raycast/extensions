/**
 * Google Chat API v1 calls. Every endpoint, parameter and filter here is checked against
 * https://chat.googleapis.com/$discovery/rest?version=v1
 */

import { randomUUID } from "node:crypto";

import { defaultSleep } from "../helpers/backoff";
import { GoogleApiError } from "../helpers/errors";
import { http } from "./google";
import type {
  ListMembershipsResponse,
  ListMessagesResponse,
  ListSpacesResponse,
  Membership,
  Message,
  Reaction,
  SearchMessagesRequest,
  SearchMessagesResponse,
  Space,
  SpaceReadState,
} from "./types";

const BASE = "https://chat.googleapis.com/v1";

/** `spaces/AAAA` -> `https://chat.googleapis.com/v1/spaces/AAAA`. Path segments are kept, ids are encoded. */
function url(path: string): string {
  return `${BASE}/${path
    .split("/")
    .map((segment) => (segment.includes(":") || segment === "-" ? segment : encodeURIComponent(segment)))
    .join("/")}`;
}

/** `spaces.list`: every space, group chat and DM the user is in (all pages, 1,000 per page). */
export async function listAllSpaces(filter?: string): Promise<Space[]> {
  const spaces: Space[] = [];
  let pageToken: string | undefined;
  do {
    const page = await http.request<ListSpacesResponse>(url("spaces"), {
      query: { pageSize: 1000, pageToken, filter },
    });
    spaces.push(...(page.spaces ?? []));
    pageToken = page.nextPageToken || undefined;
  } while (pageToken);
  return spaces;
}

/** `spaces.get` */
export function getSpace(name: string): Promise<Space> {
  return http.request<Space>(url(name));
}

/** `spaces.messages.get` */
export function getMessage(name: string): Promise<Message> {
  return http.request<Message>(url(name));
}

/** `spaces.members.list` for human members (all pages). */
export async function listMembers(spaceName: string): Promise<Membership[]> {
  const members: Membership[] = [];
  let pageToken: string | undefined;
  do {
    const page = await http.request<ListMembershipsResponse>(url(`${spaceName}/members`), {
      query: { pageSize: 1000, pageToken, filter: 'member.type = "HUMAN"' },
    });
    members.push(...(page.memberships ?? []));
    pageToken = page.nextPageToken || undefined;
  } while (pageToken);
  return members;
}

export interface ListMessagesOptions {
  pageSize?: number;
  pageToken?: string;
  /** e.g. `create_time > "2024-01-01T00:00:00Z"` */
  filter?: string;
  /** Newest first by default. */
  orderBy?: string;
}

/** `spaces.messages.list`, one page, newest first. */
export function listMessages(spaceName: string, options: ListMessagesOptions = {}): Promise<ListMessagesResponse> {
  return http.request<ListMessagesResponse>(url(`${spaceName}/messages`), {
    query: {
      pageSize: options.pageSize ?? 25,
      pageToken: options.pageToken,
      filter: options.filter,
      orderBy: options.orderBy ?? "create_time desc",
    },
  });
}

/** `spaces.messages.search` across all spaces (`parent` must be `spaces/-`). */
export function searchMessages(request: SearchMessagesRequest): Promise<SearchMessagesResponse> {
  return http.request<SearchMessagesResponse>(url("spaces/-/messages:search"), {
    method: "POST",
    body: { pageSize: 25, orderBy: "create_time desc", ...request },
  });
}

/** The Chat API allows one message write per second per space, so writes to the same space are spaced out. */
const lastWriteBySpace = new Map<string, number>();

async function waitForWriteSlot(spaceName: string): Promise<void> {
  const last = lastWriteBySpace.get(spaceName) ?? 0;
  const wait = last + 1000 - Date.now();
  if (wait > 0) await defaultSleep(wait);
  lastWriteBySpace.set(spaceName, Date.now());
}

/**
 * `spaces.messages.create`. With `threadName`, replies in that thread and falls back to a new
 * thread if it can't (`REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`).
 */
export async function createMessage(spaceName: string, text: string, threadName?: string): Promise<Message> {
  await waitForWriteSlot(spaceName);
  return http.request<Message>(url(`${spaceName}/messages`), {
    method: "POST",
    query: {
      requestId: randomUUID(),
      messageReplyOption: threadName ? "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD" : undefined,
    },
    body: threadName ? { text, thread: { name: threadName } } : { text },
  });
}

/** `users.spaces.getSpaceReadState` for the signed-in user. */
export function getSpaceReadState(spaceName: string): Promise<SpaceReadState> {
  return http.request<SpaceReadState>(url(`users/me/${spaceName}/spaceReadState`));
}

/**
 * `users.spaces.updateSpaceReadState`: marks a space read by moving `lastReadTime` to now.
 * The server coerces it to the latest message's create time.
 */
export function markSpaceAsRead(spaceName: string, at: Date = new Date()): Promise<SpaceReadState> {
  return http.request<SpaceReadState>(url(`users/me/${spaceName}/spaceReadState`), {
    method: "PATCH",
    query: { updateMask: "last_read_time" },
    body: { lastReadTime: at.toISOString() },
  });
}

/** `spaces.findDirectMessage`. Returns undefined when there's no DM with that person yet (404). */
export async function findDirectMessage(user: string): Promise<Space | undefined> {
  try {
    return await http.request<Space>(url("spaces:findDirectMessage"), {
      query: { name: user.startsWith("users/") ? user : `users/${user}` },
    });
  } catch (error) {
    if (error instanceof GoogleApiError && error.status === 404) return undefined;
    throw error;
  }
}

/** `spaces.setup` with `spaceType: DIRECT_MESSAGE` and exactly one other member. Returns the existing DM if any. */
export function setUpDirectMessage(user: string): Promise<Space> {
  return http.request<Space>(url("spaces:setup"), {
    method: "POST",
    body: {
      requestId: randomUUID(),
      space: { spaceType: "DIRECT_MESSAGE" },
      memberships: [{ member: { name: user.startsWith("users/") ? user : `users/${user}`, type: "HUMAN" } }],
    },
  });
}

/** Finds the DM with a person (email or `users/{id}`), creating it if it doesn't exist. */
export async function findOrCreateDirectMessage(user: string): Promise<Space> {
  return (await findDirectMessage(user)) ?? (await setUpDirectMessage(user));
}

/** `spaces.messages.reactions.create` with a Unicode emoji. */
export function addReaction(messageName: string, unicode: string): Promise<Reaction> {
  return http.request<Reaction>(url(`${messageName}/reactions`), {
    method: "POST",
    body: { emoji: { unicode } },
  });
}
