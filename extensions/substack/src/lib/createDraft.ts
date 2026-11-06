import { markdownToProseMirror } from "@zweer/substack-client/transform";
import { Lexer, walkTokens } from "marked";

import { createSubstackClient, publicationOrigin } from "./substackClient";

export type DraftReference = { id: number; editorUrl: string };

type DraftInput = {
  publication: string;
  sessionCookie: string;
  connectCookie?: string;
  title: string;
  subtitle: string;
  markdown: string;
};

export class DraftSaveError extends Error {
  draft: DraftReference;

  constructor(draft: DraftReference) {
    super("A draft was created, but its content could not be verified. Open it in Substack before creating another.");
    this.draft = draft;
  }
}

export { publicationOrigin } from "./substackClient";

export function draftBody(markdown: string): string {
  if (!markdown.trim()) throw new Error("Enter some Markdown for the draft.");
  const tokens = Lexer.lex(markdown);
  const blockImages = new Set<object>();
  // The upstream converter silently drops these constructs. Reject them before any writes.
  walkTokens(tokens, (token) => {
    if (["code", "table", "html", "del"].includes(token.type) || (token.type === "list_item" && token.task)) {
      throw new Error("Code blocks, tables, HTML, strikethrough, and task lists are not supported yet.");
    }
    if (token.type === "image" && !/^https:\/\//i.test(token.href)) {
      throw new Error("Images must use public HTTPS URLs. Local image uploads are not supported yet.");
    }
    if (token.type === "paragraph" && token.tokens?.some((item) => item.type === "image")) {
      if (token.tokens.some((item) => item.type !== "image")) {
        throw new Error("Put each image in its own paragraph, separated from text by blank lines.");
      }
      token.tokens.forEach((item) => blockImages.add(item));
    }
    if (token.type === "image" && !blockImages.has(token)) {
      throw new Error("Put each image in its own paragraph, separated from text by blank lines.");
    }
  });
  return JSON.stringify(markdownToProseMirror(markdown));
}

export async function createNewsletterDraft(
  input: DraftInput,
  onCreated: (draft: DraftReference) => void | Promise<void>,
): Promise<DraftReference> {
  const origin = publicationOrigin(input.publication);
  const title = input.title.trim();
  if (!title) throw new Error("Enter a title for the draft.");
  const body = draftBody(input.markdown);
  const { request } = createSubstackClient(input);

  const profile = await request<{ pub_users?: { user_id: number }[] }>("publication_user");
  const authorId = profile?.pub_users?.[0]?.user_id;
  if (!Number.isSafeInteger(authorId) || !authorId || authorId < 0) {
    throw new Error("Could not identify the publication's author. Check your publication and session cookies.");
  }
  const bylines = [{ id: authorId, is_guest: false }];
  const created = await request<{ id: number }>("drafts", "POST", {
    draft_title: title,
    draft_subtitle: input.subtitle.trim(),
    draft_bylines: bylines,
    type: "newsletter",
  });
  if (!Number.isSafeInteger(created?.id) || created?.id <= 0) {
    throw new Error("Substack did not return a draft ID. Check your drafts before trying again.");
  }
  const draft = { id: created.id, editorUrl: `${origin}/publish/post/${created.id}` };
  try {
    await onCreated(draft);
    await request(`drafts/${created.id}`, "PUT", {
      draft_title: title,
      draft_subtitle: input.subtitle.trim(),
      draft_body: body,
      draft_bylines: bylines,
      detect_language: true,
    });
    const saved = await request<{ draft_title: string; draft_body: string; is_published?: boolean }>(
      `drafts/${created.id}`,
    );
    if (!saved || saved.is_published || saved.draft_title !== title || saved.draft_body !== body) {
      throw new Error("Draft verification failed.");
    }
  } catch {
    throw new DraftSaveError(draft);
  }
  return draft;
}
