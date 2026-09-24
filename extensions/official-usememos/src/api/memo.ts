import { z } from "zod";
import type { MemosConnection } from "../helpers/preferences";
import { memosFetch } from "./client";

export const MEMO_VISIBILITIES = ["PRIVATE", "PROTECTED", "PUBLIC"] as const;
export type MemoVisibility = (typeof MEMO_VISIBILITIES)[number];

export const memoSchema = z.object({
  name: z.string(),
  creator: z.string(),
  content: z.string(),
  visibility: z.string(),
  createTime: z.string(),
  updateTime: z.string(),
  pinned: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export type Memo = z.infer<typeof memoSchema>;

const listMemosResponseSchema = z.object({
  memos: z.array(memoSchema).default([]),
  nextPageToken: z
    .string()
    .optional()
    .transform((token) => token || undefined),
});

export type MemoPage = z.infer<typeof listMemosResponseSchema>;

const quote = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

export const buildMemoFilter = ({ searchText, creator }: { searchText: string; creator?: string }) => {
  const text = searchText.trim();
  const conditions = [
    creator == null ? null : `creator == ${quote(creator)}`,
    text === "" ? null : `content.contains(${quote(text)})`,
  ].filter((condition) => condition != null);
  return conditions.length === 0 ? undefined : conditions.join(" && ");
};

type ListOptions = { filter?: string; pageToken?: string; pageSize?: number };

export const listMemos = (
  connection: MemosConnection,
  { filter, pageToken, pageSize }: ListOptions,
): Promise<MemoPage> => {
  const params = new URLSearchParams();
  if (pageSize) params.set("pageSize", String(pageSize));
  if (pageToken) params.set("pageToken", pageToken);
  if (filter) params.set("filter", filter);
  const query = params.size === 0 ? "" : `?${params}`;
  return memosFetch(connection, `/api/v1/memos${query}`, listMemosResponseSchema);
};

export type MemoDraft = { content: string; visibility: MemoVisibility };

export const createMemo = (connection: MemosConnection, memo: MemoDraft) =>
  memosFetch(connection, "/api/v1/memos", memoSchema, { method: "POST", body: memo });

export const updateMemo = (connection: MemosConnection, name: string, memo: MemoDraft) =>
  memosFetch(connection, `/api/v1/${name}?updateMask=content,visibility`, memoSchema, {
    method: "PATCH",
    body: memo,
  });
