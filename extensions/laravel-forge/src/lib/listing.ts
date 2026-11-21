import { isStatus } from "./api";
import { ForgeResource, getCollection } from "./forge";
import { forgetOrgs } from "./index-cache";
import { OrgRef, everyOrg, isKnownOrg } from "./orgs";

const PER_PAGE = 15;

// Forge honours a smaller page[size] but caps it at 30
export const perPage = (limit?: number) => Math.min(30, Math.max(1, Math.trunc(limit ?? PER_PAGE)));

// Raycast's schema extractor resolves plain scalars only, so cursors travel as one string
export type Cursors = Record<string, string>;

// The key names the account as well as the org: two accounts can hold the same slug
export const cursorKey = ({ account, org }: OrgRef) => `${account.tokenKey}/${org}`;

export const asCursors = (input?: string): Cursors | undefined => {
  if (typeof input !== "string" || !input.trim()) return undefined;
  const pairs = input
    .split(";")
    .map((entry) => {
      // Forge cursors are base64 and can carry "=" padding, so only the first splits
      const at = entry.indexOf("=");
      return at > 0 ? ([entry.slice(0, at).trim(), entry.slice(at + 1).trim()] as const) : undefined;
    })
    .filter((pair) => pair && pair[1]) as Array<readonly [string, string]>;
  return pairs.length ? Object.fromEntries(pairs) : undefined;
};

export const asCursorList = (cursors?: Cursors): string | undefined => {
  const entries = Object.entries(cursors ?? {});
  return entries.length ? entries.map(([key, after]) => `${key}=${after}`).join(";") : undefined;
};

export const usableCursors = async (cursors?: Cursors): Promise<Cursors | undefined> => {
  if (!cursors || typeof cursors !== "object") return undefined;
  const entries = await Promise.all(
    Object.entries(cursors).map(async ([key, value]) => {
      const slash = key.indexOf("/");
      if (slash < 1 || typeof value !== "string" || !value) return undefined;
      const tokenKey = key.slice(0, slash);
      const org = key.slice(slash + 1);
      return (await isKnownOrg(tokenKey, org)) ? ([key, value] as const) : undefined;
    }),
  );
  const kept = entries.filter(Boolean) as Array<readonly [string, string]>;
  return kept.length ? Object.fromEntries(kept) : undefined;
};

export const queryString = (filters: Record<string, string | undefined>, extra: string[], limit?: number) => {
  const parts = [...extra, `page[size]=${perPage(limit)}`];
  for (const [name, value] of Object.entries(filters)) {
    if (value?.trim()) parts.push(`filter[${name}]=${encodeURIComponent(value.trim())}`);
  }
  return parts.join("&");
};

export type Page = { rows: Array<{ ref: OrgRef; item: ForgeResource; included: ForgeResource[] }>; next?: Cursors };

// Nothing else evicts a cached org list, so a rejected slug drops the whole list
const stale = async (ref: OrgRef, error: unknown) => {
  if (!isStatus(error, 403, 404)) return false;
  await forgetOrgs(ref.account.tokenKey);
  return true;
};

export const walkOrgs = async (
  path: (ref: OrgRef) => string,
  search: string,
  cursors?: Cursors,
  only?: OrgRef[],
  { pages: limit = 1 }: { pages?: number } = {},
): Promise<Page> => {
  const refs = only ?? (await everyOrg());
  const resuming = await usableCursors(cursors);
  const wanted = resuming ? refs.filter((ref) => resuming[cursorKey(ref)]) : refs;

  const pages = await Promise.all(
    wanted.map(async (ref) => {
      const from = resuming?.[cursorKey(ref)] ?? "";
      try {
        const { items, included, nextCursor } = await getCollection(`${path(ref)}?${search}`, ref.account.token, {
          pages: limit,
          from,
        });
        return { ref, items, included, nextCursor, reached: true };
      } catch (error) {
        // A pinned org came from a coordinate, not the cached list: let it through
        if (only || !(await stale(ref, error))) throw error;
        return { ref, items: [], included: [], nextCursor: undefined, reached: false };
      }
    }),
  );

  // Every org failing is a real error; one failing must not hide the others
  if (pages.length && pages.every((page) => !page.reached)) {
    throw new Error("Forge rejected every organization this extension had cached. Call the same tool again.");
  }

  const rows = pages.flatMap(({ ref, items, included }) => items.map((item) => ({ ref, item, included })));
  const next = Object.fromEntries(
    pages.filter((page) => page.nextCursor).map((page) => [cursorKey(page.ref), String(page.nextCursor)]),
  );

  return { rows, next: Object.keys(next).length ? next : undefined };
};
