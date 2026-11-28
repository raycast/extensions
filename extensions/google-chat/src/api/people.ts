/**
 * People API v1 calls, checked against https://people.googleapis.com/$discovery/rest?version=v1
 */

import { Cache } from "@raycast/api";

import { mapLimit } from "../helpers/backoff";
import { chatUserNameForPerson, personInfo, personNameForChatUser, type PeopleByUser } from "../helpers/dm-names";
import { http } from "./google";
import type { GetPeopleResponse, Person, SearchDirectoryPeopleResponse } from "./types";

const BASE = "https://people.googleapis.com/v1";
const cache = new Cache({ namespace: "people" });
const PEOPLE_KEY = "people-by-user";
const ME_KEY = "me";

export interface Me {
  /** `users/{id}` in Chat terms. */
  userName: string;
  name?: string;
  email?: string;
  /** When this was fetched (ms since epoch). */
  at?: number;
}

/** Re-check who is signed in daily, in case the account changed outside the extension. */
const ME_TTL_MS = 24 * 60 * 60 * 1000;

/** `people.get` for `people/me`: the signed-in user's id, name and email. Cached. */
export async function getMe(): Promise<Me> {
  const cached = cache.get(ME_KEY);
  if (cached) {
    const me = JSON.parse(cached) as Me;
    if (me.at && Date.now() - me.at < ME_TTL_MS) return me;
  }
  const person = await http.request<Person>(`${BASE}/people/me`, { query: { personFields: "names,emailAddresses" } });
  const info = personInfo(person);
  const me: Me = {
    userName: chatUserNameForPerson(person.resourceName),
    name: info.name,
    email: info.email,
    at: Date.now(),
  };
  cache.set(ME_KEY, JSON.stringify(me));
  return me;
}

/** `people.searchDirectoryPeople` over domain profiles. */
export async function searchDirectory(query: string, pageSize = 30): Promise<Person[]> {
  if (!query.trim()) return [];
  const response = await http.request<SearchDirectoryPeopleResponse>(`${BASE}/people:searchDirectoryPeople`, {
    query: {
      query: query.trim(),
      readMask: "names,emailAddresses,photos",
      sources: "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE",
      pageSize,
    },
  });
  return response.people ?? [];
}

/** Cached names, emails and photos, keyed by Chat user name. */
export function getCachedPeople(): PeopleByUser {
  const cached = cache.get(PEOPLE_KEY);
  return cached ? (JSON.parse(cached) as PeopleByUser) : {};
}

/**
 * Looks up Chat users (`users/{id}`) with `people.getBatchGet` (200 per call, domain profiles)
 * and merges them into the cache. Unknown ids are skipped.
 */
export async function lookUpPeople(userNames: string[]): Promise<PeopleByUser> {
  const people = getCachedPeople();
  const missing = [...new Set(userNames)].filter((u) => !people[u]?.name && personNameForChatUser(u));
  if (missing.length === 0) return people;

  const chunks: string[][] = [];
  for (let i = 0; i < missing.length; i += 200) chunks.push(missing.slice(i, i + 200));
  await mapLimit(chunks, 2, async (chunk) => {
    try {
      const response = await http.request<GetPeopleResponse>(`${BASE}/people:batchGet`, {
        query: {
          resourceNames: chunk.map((u) => personNameForChatUser(u) as string),
          personFields: "names,emailAddresses,photos",
          sources: ["READ_SOURCE_TYPE_PROFILE", "READ_SOURCE_TYPE_DOMAIN_CONTACT"],
        },
      });
      for (const item of response.responses ?? []) {
        if (item.person?.resourceName) {
          people[chatUserNameForPerson(item.person.resourceName)] = personInfo(item.person);
        }
      }
    } catch (error) {
      // Names are cosmetic: fall back to emails or "Unknown person" rather than failing the command.
      console.error("People lookup failed", error);
    }
  });
  cache.set(PEOPLE_KEY, JSON.stringify(people));
  return people;
}
