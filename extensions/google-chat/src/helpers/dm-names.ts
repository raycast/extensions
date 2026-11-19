/**
 * Titles for DMs and unnamed group chats. The Chat API leaves `displayName` empty for them, so the
 * title comes from the other members: their Chat `displayName` when the API returns it, else the
 * People API profile (Chat `users/{id}` and People `people/{id}` share the id). Pure: no Raycast imports.
 */

import type { ChatUser, Membership, Person, Space, SpaceItem, SpaceKind } from "../api/types";

/** What we know about a person, keyed by Chat user name (`users/{id}`). */
export interface PersonInfo {
  name?: string;
  email?: string;
  photoUrl?: string;
}

export type PeopleByUser = Record<string, PersonInfo>;

export function spaceKind(space: Pick<Space, "spaceType">): SpaceKind {
  if (space.spaceType === "DIRECT_MESSAGE") return "dm";
  if (space.spaceType === "GROUP_CHAT") return "group";
  return "space";
}

/** `people/123` -> `users/123` */
export function chatUserNameForPerson(resourceName: string): string {
  return resourceName.replace(/^people\//, "users/");
}

/** `users/123` -> `people/123` (only for numeric ids; email aliases don't map). */
export function personNameForChatUser(userName: string): string | undefined {
  const id = userName.replace(/^users\//, "");
  return /^\d+$/.test(id) ? `people/${id}` : undefined;
}

function primary<T extends { metadata?: { primary?: boolean } }>(values: T[] | undefined): T | undefined {
  return values?.find((v) => v.metadata?.primary) ?? values?.[0];
}

/** Name, email and photo from a People API person. */
export function personInfo(person: Person): PersonInfo {
  const photo = primary(person.photos?.filter((p) => !p.default));
  return {
    name: primary(person.names)?.displayName,
    email: primary(person.emailAddresses)?.value,
    photoUrl: photo?.url,
  };
}

/** Human members of a space other than `me` (`users/{id}`). */
export function otherHumanMembers(memberships: Membership[], me: string | undefined): ChatUser[] {
  return memberships.map((m) => m.member).filter((u): u is ChatUser => !!u?.name && u.type !== "BOT" && u.name !== me);
}

/** Chat user names among `memberships` whose name we still don't know (to look up in the People API). */
export function usersNeedingLookup(memberships: Membership[], me: string | undefined, people: PeopleByUser): string[] {
  return otherHumanMembers(memberships, me)
    .filter((u) => !(u.displayName && !u.isAnonymous) && !people[u.name]?.name)
    .map((u) => u.name);
}

/** Best display name for a Chat user. */
export function userDisplayName(user: ChatUser, people: PeopleByUser = {}): string | undefined {
  if (user.displayName && !user.isAnonymous) return user.displayName;
  return people[user.name]?.name ?? user.email ?? people[user.name]?.email;
}

function joinNames(names: string[], max = 3): string {
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max}`;
}

/**
 * Builds the list item for a space: its own `displayName`, or for DMs the other person's name,
 * or for unnamed group chats the members' names.
 */
export function buildSpaceItem(
  space: Space,
  memberships: Membership[] | undefined,
  me: string | undefined,
  people: PeopleByUser = {},
): SpaceItem {
  const kind = spaceKind(space);
  if (space.displayName?.trim()) return { space, title: space.displayName.trim(), kind };

  const others = otherHumanMembers(memberships ?? [], me);
  if (kind === "dm") {
    const other = others[0];
    if (!other) {
      // A DM with yourself, or members not loaded yet.
      return { space, title: memberships && memberships.length > 0 ? "You" : "Direct Message", kind };
    }
    return {
      space,
      kind,
      title: userDisplayName(other, people) ?? "Unknown person",
      email: other.email ?? people[other.name]?.email,
      avatarUrl: other.avatarUrl ?? people[other.name]?.photoUrl,
      userName: other.name,
    };
  }
  const names = others.map((u) => userDisplayName(u, people)).filter((n): n is string => !!n);
  if (names.length > 0) return { space, title: joinNames(names), kind };
  return { space, title: kind === "group" ? "Group Chat" : "Unnamed Space", kind };
}

/** Maps every known member to a display name, for rendering senders and mentions. */
export function namesFromMembers(memberships: Membership[], people: PeopleByUser = {}): Record<string, string> {
  const names: Record<string, string> = {};
  for (const membership of memberships) {
    const user = membership.member;
    if (!user?.name) continue;
    const name = userDisplayName(user, people);
    if (name) names[user.name] = name;
  }
  for (const [user, info] of Object.entries(people)) {
    if (info.name && !names[user]) names[user] = info.name;
  }
  return names;
}
