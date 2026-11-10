// Reading /dev/null: profiles, commits, followers and search. Everything here is public, so it is read as a guest,
// with no signature. Profiles and commits come from the v1 API (routes/api.php); search comes from the endpoints the
// website's own search box calls (routes/web.php), which the v1 API has no equivalent for yet.

import { DEVNULL_URL, HttpError, request, type Log } from "./devnull";

export interface User {
  username: string;
  name: string | null;
  avatar_url?: string;
  bio?: string | null;
  company?: string | null;
  location?: string | null;
  website?: string | null;
  html_url: string;
  created_at?: string;
  /** Only on a profile, not in a list of people. */
  commits_count?: number;
  followers_count?: number;
  following_count?: number;
}

export interface CommitImage {
  url: string;
  width: number;
  height: number;
  description: string | null;
}

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
}

export interface Commit {
  id: string;
  body: string;
  html_url: string;
  created_at: string;
  parent_id?: string | null;
  stars_count?: number;
  replies_count?: number;
  images?: CommitImage[];
  link_preview?: LinkPreview | null;
  author: User;
}

/** One page, in the shape Raycast's paginated hooks take. */
export interface Page<T> {
  data: T[];
  hasMore: boolean;
  /** The next page's cursor, or undefined on the last page. */
  cursor?: string;
}

// GitHub's rules for a username, which /dev/null usernames are.
const USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

/** A username from "name", "@name", or a profile or commit URL. Undefined if it can't be one. */
export function parseUsername(input: string): string | undefined {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/^https?:\/\/(?:www\.)?dev-null\.sh\/@([^/?#]+)/)?.[1];
  const name = fromUrl ?? trimmed.replace(/^@/, "");
  return USERNAME.test(name) ? name : undefined;
}

/** The author of a commit, from its URL, which is how the commit endpoint tells us who we are. */
export function usernameFromCommitUrl(url: string | undefined): string | undefined {
  const match = url?.match(/^https:\/\/dev-null\.sh\/@([^/]+)\/commits\//);
  return match ? parseUsername(match[1]) : undefined;
}

export const profileUrl = (username: string) => `${DEVNULL_URL}/@${username}`;

async function getJson<T>(path: string, log: Log, notFound?: string): Promise<T> {
  try {
    return JSON.parse(await request(`${DEVNULL_URL}${path}`, { headers: { Accept: "application/json" } }, log)) as T;
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    if (error.status === 404 && notFound) throw new Error(notFound, { cause: error });
    // Errors are JSON, such as {"message": "Too Many Attempts."}.
    let message = error.message;
    try {
      message = (JSON.parse(error.message) as { message?: string }).message ?? message;
    } catch {
      // Not JSON: keep the body as it is.
    }
    throw new HttpError(message, error.status);
  }
}

const noSuchUser = (username: string) => `No one on /dev/null is called @${username}.`;

export async function getUser(username: string, log: Log): Promise<User> {
  const path = `/api/v1/users/${encodeURIComponent(username)}`;
  return (await getJson<{ data: User }>(path, log, noSuchUser(username))).data;
}

type Paginated<T> = { data: T[]; meta: { next_cursor: string | null } };

function page<T>(answer: Paginated<T>): Page<T> {
  const cursor = answer.meta.next_cursor ?? undefined;
  return { data: answer.data, hasMore: cursor !== undefined, cursor };
}

/** A user's commits, newest first, 20 a page; with `replies`, their replies instead. */
export async function getUserCommits(
  username: string,
  options: { cursor?: string; replies?: boolean },
  log: Log,
): Promise<Page<Commit>> {
  const query = new URLSearchParams();
  if (options.cursor) query.set("cursor", options.cursor);
  if (options.replies) query.set("replies", "1");
  const path = `/api/v1/users/${encodeURIComponent(username)}/commits${query.size ? `?${query}` : ""}`;
  return page(await getJson<Paginated<Commit>>(path, log, noSuchUser(username)));
}

/** Who follows a user, or whom they follow, 30 a page. */
export async function getConnections(
  username: string,
  kind: "followers" | "following",
  cursor: string | undefined,
  log: Log,
): Promise<Page<User>> {
  const path = `/api/v1/users/${encodeURIComponent(username)}/${kind}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`;
  return page(await getJson<Paginated<User>>(path, log, noSuchUser(username)));
}

// The website's search returns its records as they are stored, without the links the API adds, and with a
// commit's author under `user`.
type SearchUser = Omit<User, "html_url">;
type SearchCommit = Omit<Commit, "html_url" | "author"> & { user: SearchUser };

const withUrl = (user: SearchUser): User => ({ ...user, html_url: profileUrl(user.username) });

/** Up to 8 people whose name or username matches. The server allows 120 of these a minute. */
export async function searchUsers(term: string, log: Log): Promise<User[]> {
  const answer = await getJson<{ users: SearchUser[] }>(`/search/users?${new URLSearchParams({ q: term })}`, log);
  return answer.users.map(withUrl);
}

/** Up to 20 commits matching a search. The server allows only 15 of these a minute. */
export async function searchCommits(term: string, log: Log): Promise<Commit[]> {
  const answer = await getJson<{ commits: SearchCommit[] }>(`/search/commits?${new URLSearchParams({ q: term })}`, log);
  return answer.commits.map(({ user, ...commit }) => ({
    ...commit,
    html_url: `${profileUrl(user.username)}/commits/${commit.id}`,
    author: withUrl(user),
  }));
}
