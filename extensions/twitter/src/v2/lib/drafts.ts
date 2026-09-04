import { LocalStorage } from "@raycast/api";

const THREAD_DRAFT_KEY = "send-thread-draft";
let draftWriteQueue = Promise.resolve();

export interface TweetDraftContent {
  text: string;
  mediaPaths?: string[];
}

interface StoredThreadDraft {
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
    (!("mediaPaths" in value) ||
      value.mediaPaths === undefined ||
      (Array.isArray(value.mediaPaths) && value.mediaPaths.every((path) => typeof path === "string")))
  );
}

export async function loadThreadDraft(): Promise<TweetDraftContent[] | undefined> {
  const stored = await LocalStorage.getItem<string>(THREAD_DRAFT_KEY);
  if (!stored) return undefined;

  try {
    const draft = JSON.parse(stored) as Partial<StoredThreadDraft>;
    if (draft.version !== 1 || !Array.isArray(draft.tweets) || !draft.tweets.every(isTweetDraftContent)) {
      await clearThreadDraft();
      return undefined;
    }
    return draft.tweets.length > 0 ? draft.tweets : undefined;
  } catch {
    await clearThreadDraft();
    return undefined;
  }
}

export async function saveThreadDraft(tweets: TweetDraftContent[]): Promise<void> {
  const draft: StoredThreadDraft = {
    version: 1,
    updatedAt: new Date().toISOString(),
    tweets,
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
