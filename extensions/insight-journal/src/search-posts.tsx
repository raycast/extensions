import { showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useRef } from "react";
import { EntryBrowser } from "./entry-browser";
import {
  Entry,
  fetchPosts,
  getReadingTimes,
  getSavedIds,
  getUnseenPosts,
  markSeen,
  markUnseen,
  setSaved,
} from "./feed";

export default function Command() {
  const {
    data: posts = [],
    isLoading,
    revalidate,
  } = useCachedPromise(fetchPosts, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Could not load blog posts" });
    },
  });

  const {
    data: unseenIds = new Set<string>(),
    mutate: mutateUnseen,
    isLoading: isLoadingUnseen,
  } = usePromise(async (items: Entry[]) => new Set((await getUnseenPosts(items)).map((post) => post.id)), [posts], {
    execute: posts.length > 0,
  });

  // Reading times fill in once loaded; they do not hold up the list. Refresh asks the next
  // load (and only that one) to re-check pages that had no reading time.
  const retryReadingTimes = useRef(false);
  const { data: readingTimes } = usePromise(
    (items: Entry[]) => {
      const retryNow = retryReadingTimes.current;
      retryReadingTimes.current = false;
      return getReadingTimes(items, retryNow);
    },
    [posts],
    { execute: posts.length > 0 },
  );

  function refresh() {
    retryReadingTimes.current = true;
    revalidate();
  }

  const { data: savedIds = [], mutate: mutateSaved } = usePromise(getSavedIds);

  async function updateSaved(id: string, save: boolean) {
    await mutateSaved(setSaved(id, save), {
      optimisticUpdate: (current = []) => (save ? [id, ...current] : current.filter((savedId) => savedId !== id)),
      shouldRevalidateAfter: false,
    });
    await showToast({
      style: Toast.Style.Success,
      title: save ? "Saved to Reading List" : "Removed from Reading List",
    });
  }

  async function markRead(ids: string[]) {
    await mutateUnseen(markSeen(ids), {
      optimisticUpdate: (current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      },
    });
  }

  async function markUnread(ids: string[]) {
    await mutateUnseen(markUnseen(ids), {
      optimisticUpdate: (current) => new Set([...(current ?? []), ...ids]),
    });
  }

  return (
    <EntryBrowser
      kind="post"
      entries={posts}
      isLoading={isLoading || isLoadingUnseen}
      onRefresh={refresh}
      unread={{ ids: unseenIds, markRead, markUnread }}
      saved={{ ids: savedIds, setSaved: updateSaved }}
      readingTimes={readingTimes}
    />
  );
}
