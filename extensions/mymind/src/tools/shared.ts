import { getObject, hasWriteAccess, isReadOnlyWriteError, READ_ONLY_ACCESS_MESSAGE } from "../api";
import { getObjectDisplayTitle } from "../display-title";
import { getObjectBody, getObjectNoteBodies } from "../object-detail";
import { getObjectKind, MyMindObjectKind } from "../object-kind";
import { getObjectUrl } from "../object-info";
import { getMymindObjectUrl } from "../helpers";
import { isUserTag } from "../tag-utils";
import { MyMindObject } from "../types";

export type ObjectSummary = {
  id: string;
  title: string;
  type: MyMindObjectKind;
  url?: string;
  mymindUrl: string;
  summary?: string;
  tags: string[];
  spaceIds: string[];
  created: string;
  modified: string;
  body?: string;
  notes?: string[];
};

/**
 * Reduce a full mymind object down to the fields that are useful for the AI so
 * responses stay concise. Pass `includeContent` for single-object lookups where
 * the note body and attached notes matter.
 */
export function summarizeObject(item: MyMindObject, options?: { includeContent?: boolean }): ObjectSummary {
  const summary: ObjectSummary = {
    id: item.id,
    title: getObjectDisplayTitle(item),
    type: getObjectKind(item),
    url: getObjectUrl(item),
    mymindUrl: getMymindObjectUrl(item.id),
    summary: item.summary,
    tags: item.tags
      .filter(isUserTag)
      .map((tag) => tag.name)
      .filter(Boolean),
    spaceIds: item.spaces?.map((space) => space.id) ?? [],
    created: item.created,
    modified: item.modified,
  };

  if (options?.includeContent) {
    summary.body = getObjectBody(item);
    summary.notes = getObjectNoteBodies(item);
  }

  return summary;
}

/**
 * Throws a clear error when the configured key can't perform write actions so
 * the failure surfaces to the user instead of silently doing nothing.
 */
export function assertWriteAccess(): void {
  if (!hasWriteAccess()) {
    throw new Error(READ_ONLY_ACCESS_MESSAGE);
  }
}

/**
 * Runs a write operation after confirming write access and normalizes the
 * read-only API rejection into a friendly message.
 */
export async function runWrite<T>(operation: () => Promise<T>): Promise<T> {
  assertWriteAccess();

  try {
    return await operation();
  } catch (error) {
    if (isReadOnlyWriteError(error)) {
      throw new Error(READ_ONLY_ACCESS_MESSAGE);
    }

    throw error;
  }
}

/**
 * Best-effort human-readable label for an object, used in tool confirmations.
 * Falls back to the id when the object can't be fetched.
 */
export async function describeObject(id: string): Promise<string> {
  try {
    const object = await getObject(id);
    return getObjectDisplayTitle(object);
  } catch {
    return id;
  }
}
