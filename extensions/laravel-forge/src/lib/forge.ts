import { FORGE_API_URL } from "../config";
import { apiFetch, apiFetchText } from "./api";

type ForgeIdentifier = { id: string; type: string };

export type ForgeResource = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: ForgeIdentifier | ForgeIdentifier[] | null }>;
};

type ForgeCollection = {
  data?: ForgeResource[];
  included?: ForgeResource[];
  meta?: { next_cursor?: string | null };
};

// Forge caps page[size] at 30, so lists walk cursors; the limit stops a stuck cursor.
const PAGE_LIMIT = 20;

const headers = (token: string) => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export const getCollection = async (path: string, token: string, { pages = PAGE_LIMIT, from = "" } = {}) => {
  const items: ForgeResource[] = [];
  const included: ForgeResource[] = [];
  let cursor: string | null | undefined = from || undefined;

  for (let page = 0; page < pages; page++) {
    const url = new URL(`${FORGE_API_URL}/${path}`);
    if (cursor) url.searchParams.set("page[cursor]", cursor);
    const body = await apiFetch<ForgeCollection>(url.toString(), { method: "get", headers: headers(token) });
    items.push(...(body?.data ?? []));
    included.push(...(body?.included ?? []));
    cursor = body?.meta?.next_cursor;
    if (!cursor) break;
  }

  return { items, included, nextCursor: cursor };
};

export const getResource = async (path: string, token: string) => {
  const body = await apiFetch<{ data?: ForgeResource }>(`${FORGE_API_URL}/${path}`, {
    method: "get",
    headers: headers(token),
  });
  return body?.data;
};

export const postAction = async (path: string, token: string, payload: Record<string, unknown> = {}) => {
  // Actions answer 202 with an empty body, which res.json() would throw on
  await apiFetchText(`${FORGE_API_URL}/${path}`, {
    method: "post",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
};

export const flatten = <T>(resource: ForgeResource) =>
  ({ ...resource.attributes, id: Number(resource.id) }) as unknown as T;

export const relatedId = (resource: ForgeResource, name: string) => {
  const related = resource?.relationships?.[name]?.data;
  if (!related || Array.isArray(related)) return undefined;
  return Number(related.id);
};

export const relatedResource = (resource: ForgeResource, name: string, included: ForgeResource[]) => {
  const related = resource?.relationships?.[name]?.data;
  if (!related || Array.isArray(related)) return undefined;
  return included.find((entry) => entry.type === related.type && entry.id === related.id);
};
