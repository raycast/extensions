/**
 * Space directory: lists spaces and resolves titles for DMs and unnamed group chats, caching
 * memberships and People lookups between runs so only new conversations cost API calls.
 */

import { Cache } from "@raycast/api";

import { mapLimit, REQUEST_CONCURRENCY } from "../helpers/backoff";
import { buildSpaceItem, namesFromMembers, usersNeedingLookup, type PeopleByUser } from "../helpers/dm-names";
import { mentionMembers, type MentionMember } from "../helpers/mentions";
import { findSpacesByTitle, parseRecipient } from "../helpers/recipient";
import { findDirectMessage, findOrCreateDirectMessage, getSpace, listAllSpaces, listMembers } from "./chat";
import { getCachedPeople, getMe, lookUpPeople } from "./people";
import type { Membership, Space, SpaceItem } from "./types";

const membersCache = new Cache({ namespace: "members" });
/** Group chat membership can change; DMs can't. */
const GROUP_MEMBERS_TTL_MS = 3 * 24 * 60 * 60 * 1000;

interface CachedMembers {
  at: number;
  members: Membership[];
}

function needsMembers(space: Space): boolean {
  return !space.displayName?.trim() && (space.spaceType === "DIRECT_MESSAGE" || space.spaceType === "GROUP_CHAT");
}

function readMembers(space: Space, now: number): Membership[] | undefined {
  const raw = membersCache.get(space.name);
  if (!raw) return undefined;
  const cached = JSON.parse(raw) as CachedMembers;
  if (space.spaceType !== "DIRECT_MESSAGE" && now - cached.at > GROUP_MEMBERS_TTL_MS) return undefined;
  return cached.members;
}

/** Keeps only what titles need, so the cache stays small. */
function slim(members: Membership[]): Membership[] {
  return members.map((m) => ({
    name: m.name,
    member: m.member && {
      name: m.member.name,
      displayName: m.member.displayName,
      email: m.member.email,
      avatarUrl: m.member.avatarUrl,
      type: m.member.type,
      isAnonymous: m.member.isAnonymous,
    },
  }));
}

/** Members of `space`, from the cache when fresh. */
export async function getMembersCached(space: Space): Promise<Membership[]> {
  const now = Date.now();
  const cached = readMembers(space, now);
  if (cached) return cached;
  const members = slim(await listMembers(space.name));
  membersCache.set(space.name, JSON.stringify({ at: now, members } satisfies CachedMembers));
  return members;
}

/** A space list fetched less than this long ago is reused, so loaders started together share one download. */
const SPACES_SHARE_MS = 30 * 1000;
let sharedSpaces: { at: number; request: Promise<Space[]> } | undefined;

async function fetchSpacesSorted(): Promise<Space[]> {
  const spaces = await listAllSpaces();
  return spaces
    .filter((s) => !s.singleUserBotDm)
    .sort((a, b) => Date.parse(b.lastActiveTime ?? "0") - Date.parse(a.lastActiveTime ?? "0"));
}

/**
 * Spaces the user is in, most recently active first, without app DMs. My Messages' Unread, Mentions and Read
 * loads each need the list, so one request (in flight or under 30 seconds old) serves them all; a failed one
 * isn't reused. {@link forgetSpaces} makes the next call fetch afresh.
 */
export function listSpacesSorted(): Promise<Space[]> {
  if (sharedSpaces && Date.now() - sharedSpaces.at < SPACES_SHARE_MS) return sharedSpaces.request;
  const entry = { at: Date.now(), request: fetchSpacesSorted() };
  sharedSpaces = entry;
  entry.request.catch(() => {
    if (sharedSpaces === entry) sharedSpaces = undefined;
  });
  return entry.request;
}

/** Drops the shared space list (on a manual refresh), so the next {@link listSpacesSorted} fetches afresh. */
export function forgetSpaces(): void {
  sharedSpaces = undefined;
}

/** Titles for spaces, resolving DM and group chat names (10 member lookups at a time). */
export async function resolveSpaceItems(spaces: Space[]): Promise<SpaceItem[]> {
  const me = (await getMe()).userName;
  const membersBySpace = new Map<string, Membership[]>();
  await mapLimit(spaces.filter(needsMembers), REQUEST_CONCURRENCY, async (space) => {
    try {
      membersBySpace.set(space.name, await getMembersCached(space));
    } catch (error) {
      console.error(`Members lookup failed for ${space.name}`, error);
    }
  });
  let people: PeopleByUser = getCachedPeople();
  const lookups = [...membersBySpace.values()].flatMap((members) => usersNeedingLookup(members, me, people));
  if (lookups.length > 0) people = await lookUpPeople(lookups);
  return spaces.map((space) => buildSpaceItem(space, membersBySpace.get(space.name), me, people));
}

/** All spaces with resolved titles. */
export async function loadSpaceItems(): Promise<SpaceItem[]> {
  return resolveSpaceItems(await listSpacesSorted());
}

/** Display names for everyone in a space (for senders and mentions). */
export async function loadUserNames(space: Space): Promise<Record<string, string>> {
  const members = await getMembersCached(space);
  let people = getCachedPeople();
  const lookups = usersNeedingLookup(members, undefined, people);
  if (lookups.length > 0) people = await lookUpPeople(lookups);
  return namesFromMembers(members, people);
}

/**
 * People who can be @mentioned in a space: its human members other than the signed-in user, with names,
 * emails and photos from Chat or the People API (cached). Sorted by name.
 */
export async function loadMentionMembers(space: Space): Promise<MentionMember[]> {
  const [members, me] = await Promise.all([getMembersCached(space), getMe()]);
  let people = getCachedPeople();
  const lookups = usersNeedingLookup(members, me.userName, people);
  if (lookups.length > 0) people = await lookUpPeople(lookups);
  return mentionMembers(members, me.userName, people);
}

/**
 * Resolves what the user typed (email, `users/{id}`, `spaces/{id}`, Chat link, or exact title)
 * to a space. Emails and user names open the DM, creating it if needed (unless `createDm` is false).
 */
export async function resolveRecipient(input: string, options: { createDm?: boolean } = {}): Promise<SpaceItem> {
  const { createDm = true } = options;
  const recipient = parseRecipient(input);
  if (recipient.kind === "email" || recipient.kind === "user") {
    const id = recipient.kind === "email" ? recipient.email : recipient.name;
    const space = createDm ? await findOrCreateDirectMessage(id) : await findDirectMessage(id);
    if (!space) throw new Error(`You don't have a direct message with ${id} yet`);
    const [item] = await resolveSpaceItems([space]);
    return { ...item, email: item.email ?? (recipient.kind === "email" ? recipient.email : undefined) };
  }
  if (recipient.kind === "space") {
    const [item] = await resolveSpaceItems([await getSpace(recipient.name)]);
    return item;
  }
  const matches = findSpacesByTitle(await loadSpaceItems(), recipient.title);
  if (matches.length === 0) throw new Error(`No space or direct message is called "${recipient.title}"`);
  if (matches.length > 1) {
    throw new Error(`"${recipient.title}" matches ${matches.length} conversations; use an email or a space link`);
  }
  return matches[0];
}
