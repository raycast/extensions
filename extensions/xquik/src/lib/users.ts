import { request } from "./api";
import { FollowCheck, followCheckSchema, Profile, profileSchema, userPageSchema } from "./schemas";

const PAGE_SIZE = 20;

export type UserPage = { users: Profile[]; nextCursor: string | undefined };

export async function fetchUserPage(query: string, cursor?: string): Promise<UserPage> {
  const page = await request(userPageSchema, "/x/users/search", { query: { q: query, limit: PAGE_SIZE, cursor } });
  return { users: page.users, nextCursor: page.has_next_page ? page.next_cursor || undefined : undefined };
}

export function fetchProfile(user: string): Promise<Profile> {
  return request(profileSchema, `/x/users/${encodeURIComponent(user)}`);
}

export function checkFollow(source: string, target: string): Promise<FollowCheck> {
  return request(followCheckSchema, "/x/followers/check", { query: { source, target } });
}
