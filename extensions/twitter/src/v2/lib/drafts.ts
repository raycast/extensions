import { LocalStorage } from "@raycast/api";
import { POLL_DURATION_PRESETS } from "./poll_duration";

const THREAD_DRAFT_KEY = "send-thread-draft";
let draftWriteQueue = Promise.resolve();

export interface TweetDraftContent {
  text: string;
  replyToPostId?: string;
  mediaPaths?: string[];
}

export interface DraftSettings {
  replySettings: "everyone" | "following" | "mentionedUsers";
  quotePostId: string;
  includePoll: boolean;
  pollOptions: string[];
  pollDurationPreset: string;
  customPollDurationMinutes: string;
}

interface StoredThreadDraft {
  settings?: DraftSettings;
  version: 1;
  updatedAt: string;
  tweets: TweetDraftContent[];
}

function isTweetDraftContent(value: unknown): value is TweetDraftContent {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof value.text === "string" &&
    (!("replyToPostId" in value) ||
      value.replyToPostId === undefined ||
      (typeof value.replyToPostId === "string" && /^\d{1,19}$/.test(value.replyToPostId))) &&
    (!("mediaPaths" in value) ||
      value.mediaPaths === undefined ||
      (Array.isArray(value.mediaPaths) && value.mediaPaths.every((path) => typeof path === "string")))
  );
}

function isDraftSettings(value: unknown): value is DraftSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as DraftSettings;
  return (
    ["everyone", "following", "mentionedUsers"].includes(settings.replySettings) &&
    typeof settings.quotePostId === "string" &&
    typeof settings.includePoll === "boolean" &&
    Array.isArray(settings.pollOptions) &&
    settings.pollOptions.length === 4 &&
    settings.pollOptions.every((option) => typeof option === "string") &&
    (settings.pollDurationPreset === "custom" ||
      POLL_DURATION_PRESETS.some(({ value }) => value === settings.pollDurationPreset)) &&
    typeof settings.customPollDurationMinutes === "string"
  );
}

export async function loadThreadDraft(): Promise<StoredThreadDraft | undefined> {
  const stored = await LocalStorage.getItem<string>(THREAD_DRAFT_KEY);
  if (!stored) return undefined;

  try {
    const draft = JSON.parse(stored) as Partial<StoredThreadDraft>;
    if (draft.version !== 1 || !Array.isArray(draft.tweets) || !draft.tweets.every(isTweetDraftContent)) {
      await clearThreadDraft();
      return undefined;
    }
    if (draft.settings !== undefined && !isDraftSettings(draft.settings)) delete draft.settings;
    return draft.tweets.length > 0 ? (draft as StoredThreadDraft) : undefined;
  } catch {
    await clearThreadDraft();
    return undefined;
  }
}

export async function saveThreadDraft(tweets: TweetDraftContent[], settings?: DraftSettings): Promise<void> {
  const draft: StoredThreadDraft = {
    version: 1,
    updatedAt: new Date().toISOString(),
    tweets,
    settings,
  };
  draftWriteQueue = draftWriteQueue
    .catch(() => undefined)
    .then(async () => await LocalStorage.setItem(THREAD_DRAFT_KEY, JSON.stringify(draft)));
  await draftWriteQueue;
}

export async function clearThreadDraft(): Promise<void> {
  await draftWriteQueue.catch(() => undefined);
  await LocalStorage.removeItem(THREAD_DRAFT_KEY);
}
