/**
 * Space directory: lists spaces and resolves titles for DMs and unnamed group chats, caching
 * memberships and People lookups between runs so only new conversations cost API calls.
 */

import { Cache } from "@raycast/api";

import { mapLimit } from "../helpers/backoff";
import { buildSpaceItem, namesFromMembers, usersNeedingLookup, type PeopleByUser } from "../helpers/dm-names";
import { listAllSpaces, listMembers } from "./chat";
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

/** Spaces the user is in, most recently active first, without app DMs. */
export async function listSpacesSorted(): Promise<Space[]> {
  const spaces = await listAllSpaces();
  return spaces
    .filter((s) => !s.singleUserBotDm)
    .sort((a, b) => Date.parse(b.lastActiveTime ?? "0") - Date.parse(a.lastActiveTime ?? "0"));
}

/** Titles for spaces, resolving DM and group chat names (5 member lookups at a time). */
export async function resolveSpaceItems(spaces: Space[]): Promise<SpaceItem[]> {
  const me = (await getMe()).userName;
  const membersBySpace = new Map<string, Membership[]>();
  await mapLimit(spaces.filter(needsMembers), 5, async (space) => {
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
