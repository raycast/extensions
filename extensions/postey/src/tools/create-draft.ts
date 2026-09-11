import { AI, LocalStorage, Tool } from "@raycast/api";
import { createDraft } from "../lib/api";
import {
  DEFAULT_SOCIAL_SET_STORAGE_KEY,
  getPlatformLabel,
  PLATFORM_KEYS,
  PLATFORM_SELECTIONS_STORAGE_KEY,
  type PlatformKey,
} from "../lib/constants";

type Input = {
  /** The full text you want to post as a social media draft. Use --- on its own line to split a thread. */
  content?: string;
  /** Draft prompt or idea. Required if content is omitted. */
  prompt?: string;
  /** Platforms to post to. Subset of: X, LINKEDIN. If omitted, all enabled platforms on the account are used. */
  platforms?: string[];
  /** Optional title for the draft. */
  title?: string;
  /** Optional ISO 8601 date to schedule the draft. */
  schedule_at?: string;
  /** Optional tag IDs to apply to the draft. */
  tags?: number[];
};

async function resolveContent(input: Input) {
  const content = input.content?.trim();
  if (content) {
    return content;
  }

  const prompt = input.prompt?.trim();
  if (!prompt) {
    return "";
  }

  const aiPrompt = [
    "Write a social media draft for Postey.",
    "Return ONLY the draft text. Do not add quotes or commentary.",
    "If the request is for a thread, separate posts with a line containing only ---.",
    `User request: ${prompt}`,
  ].join("\n");

  return (await AI.ask(aiPrompt, { creativity: "medium" })).trim();
}

function buildDraftTitle(content: string, title?: string) {
  const trimmedTitle = title?.trim();
  if (trimmedTitle) {
    return trimmedTitle;
  }

  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Untitled draft";
  }

  return firstLine.length > 80 ? `${firstLine.slice(0, 80).trim()}…` : firstLine;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const platformLabel = input.platforms?.length
    ? input.platforms.map((platform) => getPlatformLabel(platform)).join(", ")
    : "all enabled platforms";
  const content = input.content?.trim();
  const prompt = input.prompt?.trim();
  const previewSource = content || prompt || "";
  const preview = previewSource.length > 80 ? previewSource.slice(0, 80) + "…" : previewSource;
  const sourceLabel = content ? "content" : prompt ? "prompt" : "content";
  return {
    message: `Create draft on ${platformLabel} with ${sourceLabel}: "${preview}"?`,
  };
};

async function getDefaultSocialSetId() {
  const storedSocialSetId = await LocalStorage.getItem<string>(DEFAULT_SOCIAL_SET_STORAGE_KEY);
  const socialSetId = Number(storedSocialSetId);
  if (!storedSocialSetId || !Number.isFinite(socialSetId)) {
    throw new Error("No default social set configured. Open the 'Search Social Sets' command to set a default.");
  }
  return socialSetId;
}

async function getStoredPlatformsForSocialSet(socialSetId: number) {
  const raw = await LocalStorage.getItem<string>(PLATFORM_SELECTIONS_STORAGE_KEY);
  if (!raw) {
    return [] as PlatformKey[];
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    const selected = parsed[String(socialSetId)] ?? [];
    return selected.filter((p): p is PlatformKey => PLATFORM_KEYS.includes(p as PlatformKey));
  } catch {
    return [] as PlatformKey[];
  }
}

/**
 * Create a draft on Postey.
 * IMPORTANT: Provide content (full draft text) or prompt (idea). Do not call without one.
 */
export default async function tool(input: Input) {
  const content = await resolveContent(input);
  if (!content) {
    throw new Error("Content is required. Provide draft text or a prompt to generate it.");
  }

  const socialSetId = await getDefaultSocialSetId();
  const storedPlatforms = await getStoredPlatformsForSocialSet(socialSetId);
  const enabledPlatforms = storedPlatforms.length > 0 ? storedPlatforms : [...PLATFORM_KEYS];

  const platformKeys = input.platforms?.length
    ? (input.platforms.filter((p) => enabledPlatforms.includes(p as PlatformKey)) as PlatformKey[])
    : enabledPlatforms;

  if (platformKeys.length === 0) {
    throw new Error(`Invalid platforms. Choose from: ${PLATFORM_KEYS.join(", ")}`);
  }

  const draftTitle = buildDraftTitle(content, input.title);
  return await createDraft({
    account_id: socialSetId,
    platforms: platformKeys,
    post_raw_content: content,
    publish_now: false,
    schedule_at: input.schedule_at || undefined,
    draft_title: draftTitle,
    tags: input.tags?.length ? input.tags : undefined,
  });
}
