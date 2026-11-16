import type { Tool } from "@raycast/api";
import type { Post } from "@xeet/core";
import { previewResult, renderingOptions, saveToolDraft, type RenderingOptions } from "../lib/ai";
import { readAvatar } from "../lib/files";
import { getEngine, renderPost } from "../lib/renderer";
import { settings } from "../lib/settings";

type Input = {
  /** Exact post text to preview. This tool never publishes to X. */
  text: string;
  author?: {
    name?: string;
    /** X handle, with or without a leading @. */
    handle?: string;
    verified?: "none" | "blue" | "business" | "government";
    squareAvatar?: boolean;
    /** Absolute path to a user-specified local PNG, JPEG, or WebP avatar, up to 8 MB. */
    avatarPath?: string;
  };
  counts?: { replies?: number; reposts?: number; likes?: number; views?: number; bookmarks?: number };
  replyToHandle?: string;
  /** ISO 8601 timestamp for the mock post. */
  createdAt?: string;
  options?: RenderingOptions;
  /** Save to Saved Drafts as well, only when the user asks to save a draft. */
  saveDraft?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async ({ text, saveDraft }) => {
  if (!saveDraft) return undefined;
  return {
    message: "Create this preview and save it to Saved Drafts?",
    info: [{ name: "Post", value: text.slice(0, 200) }],
  };
};

/** Create an offline custom post PNG with author details, verification, counts, and appearance. */
export default async function createPostPreview(input: Input) {
  const defaults = settings();
  const author = input.author;
  const post: Post = {
    text: input.text,
    author: {
      name: author?.name ?? defaults.authorName ?? "Your Name",
      handle: (author?.handle ?? defaults.authorHandle ?? "yourhandle").replace(/^@/, ""),
      verified: author?.verified,
      squareAvatar: author?.squareAvatar,
      avatar: author?.avatarPath ? await readAvatar(author.avatarPath) : undefined,
    },
    counts: input.counts,
    replyToHandle: input.replyToHandle?.replace(/^@/, ""),
    createdAt: input.createdAt,
  };
  const options = renderingOptions(input.options);
  getEngine().explain(post, options);
  const preview = previewResult(await renderPost(post, options));
  const draft = input.saveDraft ? await saveToolDraft(post, options) : null;
  return { ...preview, draft };
}
