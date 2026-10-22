import type { AccountConnection } from "./accounts";
import { createSubstackClient, publicationOrigin } from "./substackClient";

export type NewsletterDraft = {
  accountId: string;
  id: number;
  title: string;
  subtitle?: string;
  updatedAt?: string;
  editorUrl: string;
};
export type DraftPage = { drafts: NewsletterDraft[]; nextOffset?: number };
const malformed = "Substack returned an unexpected draft list. Refresh or open the publication in Substack.";
export function parseDraftPage(value: unknown, account: AccountConnection, offset: number): DraftPage {
  const response = value as {
    posts?: unknown[];
    offset?: number;
    limit?: number;
    total?: number;
    isCapped?: boolean;
  } | null;
  if (
    !response ||
    !Array.isArray(response.posts) ||
    response.offset !== offset ||
    !Number.isSafeInteger(response.limit) ||
    response.limit! <= 0 ||
    !Number.isSafeInteger(response.total) ||
    response.total! < 0 ||
    response.posts.length > response.limit! ||
    response.total! < offset + response.posts.length ||
    (response.isCapped !== undefined && typeof response.isCapped !== "boolean")
  )
    throw new Error(malformed);
  if (response.isCapped)
    throw new Error("Substack capped the draft list. Open the publication in Substack to see all drafts.");
  const origin = publicationOrigin(account.publication);
  const drafts: NewsletterDraft[] = [];
  for (const value of response.posts) {
    if (!value || typeof value !== "object") throw new Error(malformed);
    const post = value as {
      id?: number;
      is_published?: boolean;
      draft_title?: string;
      draft_subtitle?: string | null;
      draft_updated_at?: string | null;
      type?: string;
    };
    if (
      !Number.isSafeInteger(post.id) ||
      post.id! <= 0 ||
      typeof post.is_published !== "boolean" ||
      typeof post.draft_title !== "string" ||
      (post.draft_subtitle != null && typeof post.draft_subtitle !== "string") ||
      (post.draft_updated_at != null &&
        (typeof post.draft_updated_at !== "string" || !Number.isFinite(Date.parse(post.draft_updated_at))))
    )
      throw new Error(malformed);
    if (post.is_published || post.type !== "newsletter") continue;
    drafts.push({
      accountId: account.id,
      id: post.id!,
      title: post.draft_title.trim() || "Untitled draft",
      ...(post.draft_subtitle ? { subtitle: post.draft_subtitle } : {}),
      ...(post.draft_updated_at ? { updatedAt: post.draft_updated_at } : {}),
      editorUrl: `${origin}/publish/post/${post.id}`,
    });
  }
  const nextOffset = offset + response.limit!;
  if (nextOffset < response.total! && response.posts.length === 0) throw new Error(malformed);
  return { drafts, ...(nextOffset < response.total! ? { nextOffset } : {}) };
}
export async function listNewsletterDrafts(account: AccountConnection, offset = 0): Promise<DraftPage> {
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("Use a non-negative integer draft offset.");
  const { request } = createSubstackClient(account);
  const query = new URLSearchParams({
    offset: String(offset),
    limit: "25",
    order_by: "draft_updated_at",
    order_direction: "desc",
  });
  return parseDraftPage(await request(`post_management/drafts?${query}`), account, offset);
}
