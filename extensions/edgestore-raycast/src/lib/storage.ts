import { LocalStorage } from "@raycast/api";
import { StoredState, BucketConfig } from "./types";

const STORAGE_KEY = "edgestore_state";

async function readState(): Promise<StoredState> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return { bucketsByRefId: {} };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      bucketsByRefId: parsed.bucketsByRefId ?? {},
      lastUsedBucketRefId: parsed.lastUsedBucketRefId,
    };
  } catch {
    return { bucketsByRefId: {} };
  }
}

async function writeState(next: StoredState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function saveBucketConfig(config: BucketConfig): Promise<void> {
  const state = await readState();
  const bucketsByRefId = { ...state.bucketsByRefId, [config.bucketRefId]: config };
  const next: StoredState = {
    bucketsByRefId,
    // If no last used bucket is set (first bucket configured), initialize it to this bucket
    lastUsedBucketRefId: state.lastUsedBucketRefId ?? config.bucketRefId,
  };
  await writeState(next);
}

export async function getAllBuckets(): Promise<BucketConfig[]> {
  const state = await readState();
  return Object.values(state.bucketsByRefId);
}

export async function getBucket(bucketRefId: string): Promise<BucketConfig | undefined> {
  const state = await readState();
  return state.bucketsByRefId[bucketRefId];
}

export async function getLastUsedBucket(): Promise<BucketConfig | undefined> {
  const state = await readState();
  const id = state.lastUsedBucketRefId;
  if (!id) return undefined;
  return state.bucketsByRefId[id];
}

export async function deleteBucket(bucketRefId: string): Promise<void> {
  const state = await readState();
  const { [bucketRefId]: _removed, ...rest } = state.bucketsByRefId as Record<string, BucketConfig>;
  const next: StoredState = {
    bucketsByRefId: rest,
    lastUsedBucketRefId: state.lastUsedBucketRefId === bucketRefId ? undefined : state.lastUsedBucketRefId,
  };
  await writeState(next);
}

export async function setLastUsedBucket(bucketRefId: string): Promise<void> {
  const state = await readState();
  const next: StoredState = {
    ...state,
    lastUsedBucketRefId: bucketRefId,
  };
  await writeState(next);
}

export async function updateBucketTemporaryFlag(bucketRefId: string, temporaryFiles: boolean): Promise<void> {
  const state = await readState();
  const bucket = state.bucketsByRefId[bucketRefId];
  if (!bucket) return;

  const updatedBucket = { ...bucket, temporaryFiles };
  const next: StoredState = {
    ...state,
    bucketsByRefId: { ...state.bucketsByRefId, [bucketRefId]: updatedBucket },
  };
  await writeState(next);
}
