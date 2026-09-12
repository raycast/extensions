import type { SlackMember } from "./slackTypes";
import { toUserName } from "./member";
import { CursorPage, foldForSearch, matchesAllWords, matchesVisibleName } from "./pagination";

class Matches<T> {
  private entries: { value: T; preferred: boolean }[] = [];
  constructor(private limit: number) {}
  add(value: T, preferred: boolean) {
    if (this.entries.length < this.limit) this.entries.push({ value, preferred });
    else if (preferred) {
      const index = this.entries.findIndex((entry) => !entry.preferred);
      if (index >= 0) this.entries[index] = { value, preferred };
    }
  }
  get full() {
    return this.entries.length >= this.limit && this.entries.every((entry) => entry.preferred);
  }
  get values() {
    return this.entries.map((entry) => entry.value);
  }
}

/** One scan retains at most maxResults users and maxResults compact names per distinct query word. */
export async function searchMemberDirectory<User>({
  query,
  maxResults,
  loadPage,
  toUser,
  signal,
}: {
  query: string;
  maxResults: number;
  loadPage: (cursor?: string) => Promise<CursorPage<SlackMember>>;
  toUser?: (member: SlackMember) => User | undefined;
  signal?: AbortSignal;
}): Promise<{ users: User[]; userNames: ReadonlyMap<string, string> }> {
  const words = [...new Set(foldForSearch(query).split(/\s+/).filter(Boolean))];
  const users = new Matches<User>(maxResults);
  const names = (words.length ? words : toUser ? [""] : []).map((word) => ({
    word,
    matches: new Matches<readonly [string, string]>(maxResults),
  }));
  if (!toUser && !words.length) return { users: [], userNames: new Map() };
  let cursor: string | undefined;
  do {
    signal?.throwIfAborted();
    const page = await loadPage(cursor);
    signal?.throwIfAborted();
    for (const member of page.items) {
      const name = toUserName(member);
      if (!name) continue;
      const searchable = [
        name[1],
        member.name,
        member.real_name,
        member.profile?.display_name,
        member.profile?.real_name,
        member.profile?.email,
        member.profile?.title,
      ];
      if (toUser && matchesAllWords(searchable, query)) {
        const user = toUser(member);
        if (user) users.add(user, matchesVisibleName(name[1], query));
      }
      for (const bucket of names) {
        if (matchesAllWords(searchable, bucket.word))
          bucket.matches.add(name, matchesVisibleName(name[1], bucket.word));
      }
      if ((!toUser || users.full) && names.every((bucket) => bucket.matches.full)) break;
    }
    cursor = page.nextCursor || undefined;
  } while (cursor && words.length && !((!toUser || users.full) && names.every((bucket) => bucket.matches.full)));
  return { users: users.values, userNames: new Map(names.flatMap((bucket) => bucket.matches.values)) };
}
