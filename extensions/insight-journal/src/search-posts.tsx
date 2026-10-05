import { showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
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

  const { data: readingTimes, isLoading: isLoadingReadingTimes } = usePromise(
    (items: Entry[]) => getReadingTimes(items),
    [posts],
    { execute: posts.length > 0 },
  );

  const { data: savedIds = [], mutate: mutateSaved } = usePromise(getSavedIds);

  async function toggleSaved(id: string) {
    const save = !savedIds.includes(id);
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
      isLoading={isLoading || isLoadingUnseen || isLoadingReadingTimes}
      onRefresh={revalidate}
      unread={{ ids: unseenIds, markRead, markUnread }}
      saved={{ ids: savedIds, toggle: toggleSaved }}
      readingTimes={readingTimes}
    />
  );
}
