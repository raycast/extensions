import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { MAX_READ_POSTS_STORED, READ_POSTS_KEY } from "./constants";

async function loadReadIds(): Promise<Set<number>> {
  const raw = await LocalStorage.getItem<string>(READ_POSTS_KEY);
  if (!raw) return new Set();
  try {
    const ids = JSON.parse(raw) as number[];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

async function persistReadIds(ids: Set<number>): Promise<Set<number>> {
  const arr = [...ids].slice(-MAX_READ_POSTS_STORED);
  const next = new Set(arr);
  await LocalStorage.setItem(READ_POSTS_KEY, JSON.stringify(arr));
  return next;
}

export function useReadPosts() {
  const [readIds, setReadIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadReadIds().then(setReadIds);
  }, []);

  const markRead = useCallback(async (postId: number) => {
    const ids = await loadReadIds();
    if (ids.has(postId)) return;
    ids.add(postId);
    setReadIds(await persistReadIds(ids));
  }, []);

  const markUnread = useCallback(async (postId: number) => {
    const ids = await loadReadIds();
    if (!ids.has(postId)) return;
    ids.delete(postId);
    setReadIds(await persistReadIds(ids));
  }, []);

  const isRead = useCallback(
    (postId: number) => readIds.has(postId),
    [readIds],
  );

  return { isRead, markRead, markUnread };
}
