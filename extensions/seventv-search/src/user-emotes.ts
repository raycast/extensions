import type { Emote, EmoteUsage, SearchArgs, SearchResult } from "./providers";

export interface SevenTVUser {
  id: string;
  name: string;
  handle: string;
  platform: string;
  avatar?: string;
}
export type UserEmoteMode = "channel" | "creator";
export interface UserEmoteSource {
  title: string;
  emptyDescription: string;
  invalidate?(): void;
  load(args: SearchArgs, signal?: AbortSignal): Promise<SearchResult>;
}
interface Connection {
  platform: string;
  platformUsername: string;
  platformDisplayName: string;
  platformAvatarUrl?: string | null;
}
interface APIEmote {
  id: string;
  defaultName: string;
  flags: EmoteUsage & { animated?: boolean };
  owner?: { mainConnection?: { platformDisplayName: string } };
  images?: { url: string; mime: string; width: number; height: number }[];
}
const PAGE_SIZE = 60;
const EMOTE_FIELDS = `id defaultName flags{animated approvedPersonal deniedPersonal private publicListed nsfw}
 owner{mainConnection{platformDisplayName}} images{url mime width height}`;

async function query<T>(
  document: string,
  variables: Record<string, unknown>,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch,
): Promise<T> {
  const response = await fetcher("https://api.7tv.app/v4/gql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: document, variables }),
    signal,
  });
  if (!response.ok) throw new Error(`7TV returned ${response.status}`);
  const body = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (body.errors?.length) throw new Error(body.errors[0].message);
  if (!body.data) throw new Error("7TV returned no data");
  return body.data;
}
const publicEmote = (emote: APIEmote) =>
  !emote.flags.private && emote.flags.publicListed !== false;
function mapEmote(emote: APIEmote, alias?: string): Emote {
  return {
    id: emote.id,
    name: alias ?? emote.defaultName,
    provider: "7tv",
    animated: emote.flags.animated,
    usage: emote.flags,
    owner: emote.owner?.mainConnection
      ? { display_name: emote.owner.mainConnection.platformDisplayName }
      : undefined,
    host: {
      url: `https://cdn.7tv.app/emote/${emote.id}`,
      files: (emote.images ?? []).map((image) => ({
        name: new URL(image.url).pathname.split("/").pop()!,
        url: image.url,
        format: image.mime.split("/")[1],
        width: image.width,
        height: image.height,
      })),
    },
  };
}

export async function searchSevenTVUsers(
  text: string,
  page: number,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  if (!text.trim())
    return { items: [] as SevenTVUser[], total: 0, hasMore: false };
  const data = await query<{
    users: {
      search: {
        items: {
          id: string;
          mainConnection?: Connection;
          connections?: Connection[];
        }[];
        totalCount: number;
        pageCount: number;
      };
    };
  }>(
    `query($query:String!,$page:Int!){users{search(query:$query,page:$page,perPage:30){totalCount pageCount items{id mainConnection{platform platformUsername platformDisplayName platformAvatarUrl} connections{platform platformUsername platformDisplayName platformAvatarUrl}}}}}`,
    { query: text.trim(), page },
    signal,
    fetcher,
  );
  const result = data.users.search;
  const items = result.items.map((user) => {
    const connection = user.mainConnection ?? user.connections?.[0];
    return {
      id: user.id,
      name: connection?.platformDisplayName ?? user.id,
      handle: connection?.platformUsername ?? user.id,
      platform: connection?.platform ?? "7TV",
      avatar: connection?.platformAvatarUrl ?? undefined,
    };
  });
  // Rank exact handles first within the API page without dropping set-name matches.
  const term = text.trim().toLowerCase();
  items.sort(
    (a, b) =>
      Number(b.handle.toLowerCase() === term) -
      Number(a.handle.toLowerCase() === term),
  );
  return { items, total: result.totalCount, hasMore: page < result.pageCount };
}

export function createSevenTVUserSource(
  user: SevenTVUser,
  mode: UserEmoteMode,
  fetcher: typeof fetch = fetch,
): UserEmoteSource {
  let uploads: APIEmote[] | undefined;
  return {
    invalidate() {
      uploads = undefined;
    },
    title: `${user.name} · ${mode === "channel" ? "Channel Emotes" : "Uploaded Emotes"}`,
    emptyDescription:
      mode === "channel"
        ? "No matching public emotes in this user's active channel set."
        : "No matching public uploads from this creator.",
    async load(args, signal) {
      if (mode === "channel") {
        let page = args.page === 1 ? 1 : Number(args.cursor ?? args.page);
        if (!Number.isInteger(page) || page < 1) page = 1;
        // A server page can contain only static or unlisted entries. Advance until
        // there are visible matches or the set ends so an empty page cannot trap pagination.
        while (true) {
          const data = await query<{
            users: {
              user?: {
                style: {
                  activeEmoteSet?: {
                    emotes: {
                      totalCount: number;
                      pageCount: number;
                      items: { alias: string; emote: APIEmote }[];
                    };
                  };
                };
              };
            };
          }>(
            `query($id:Id!,$page:Int!,$query:String){users{user(id:$id){style{activeEmoteSet{emotes(page:$page,perPage:60,query:$query){totalCount pageCount items{alias emote{${EMOTE_FIELDS}}}}}}}}}`,
            { id: user.id, page, query: args.query.trim() || null },
            signal,
            fetcher,
          );
          const result = data.users.user?.style.activeEmoteSet?.emotes;
          if (!result) return { items: [], total: 0, hasMore: false };
          const visible = result.items.filter(
            (item) =>
              publicEmote(item.emote) &&
              (!args.animatedOnly || item.emote.flags.animated),
          );
          const items = visible.map((item) => mapEmote(item.emote, item.alias));
          const hasMore = page < result.pageCount;
          if (items.length || !hasMore)
            return {
              items,
              total: undefined,
              hasMore,
              nextCursor: hasMore ? String(page + 1) : undefined,
            };
          page++;
        }
      }
      if (!uploads) {
        // ownedEmotes has no server pagination. Fetch only basic metadata first;
        // image variants are requested for the visible page, not the entire library.
        const data = await query<{
          users: { user?: { ownedEmotes: APIEmote[] } };
        }>(
          `query($id:Id!){users{user(id:$id){ownedEmotes{id defaultName flags{animated approvedPersonal deniedPersonal private publicListed nsfw}}}}}`,
          { id: user.id },
          signal,
          fetcher,
        );
        signal?.throwIfAborted();
        uploads = (data.users.user?.ownedEmotes ?? []).filter(publicEmote);
      }
      const term = args.query.trim().toLowerCase();
      const matches = uploads.filter(
        (emote) =>
          emote.defaultName.toLowerCase().includes(term) &&
          (!args.animatedOnly || emote.flags.animated),
      );
      const pageItems = matches.slice(
        (args.page - 1) * PAGE_SIZE,
        args.page * PAGE_SIZE,
      );
      const items: Emote[] = [];
      // Keep each GraphQL request below the anonymous query-complexity limit.
      for (let offset = 0; offset < pageItems.length; offset += 10) {
        const batch = pageItems.slice(offset, offset + 10);
        const variables = Object.fromEntries(
          batch.map((emote, index) => [`id${index}`, emote.id]),
        );
        const declarations = batch
          .map((_, index) => `$id${index}:Id!`)
          .join(",");
        const fields = batch
          .map((_, index) => `e${index}:emote(id:$id${index}){${EMOTE_FIELDS}}`)
          .join(" ");
        const data = await query<{ emotes: Record<string, APIEmote | null> }>(
          `query(${declarations}){emotes{${fields}}}`,
          variables,
          signal,
          fetcher,
        );
        items.push(
          ...batch.flatMap((_, index) => {
            const emote = data.emotes[`e${index}`];
            return emote && publicEmote(emote) ? [mapEmote(emote)] : [];
          }),
        );
      }
      return {
        items,
        total: matches.length,
        hasMore: args.page * PAGE_SIZE < matches.length,
      };
    },
  };
}

export function getUsageDescription(usage?: EmoteUsage) {
  if (!usage) return "Personal-set status not provided";
  if (usage.deniedPersonal) return "Denied for 7TV personal emote sets";
  if (usage.approvedPersonal) return "Approved for 7TV personal emote sets";
  return "Not approved for 7TV personal emote sets";
}
