import { useCallback, useEffect, useReducer, useRef } from "react";
import { FollowLatestPolicy } from "../lib/scroll-policy";

export function useFollowLatest(
  latestId: string | undefined,
  itemIds: string[],
  streaming: boolean,
) {
  const policy = useRef(new FollowLatestPolicy());
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const snapshot = useRef({ latestId, visible: new Set(itemIds) });
  snapshot.current = { latestId, visible: new Set(itemIds) };
  const following = policy.current.following;
  const selectedItemId = policy.current.selection(
    latestId,
    snapshot.current.visible,
  );

  useEffect(() => {
    const next = policy.current.nextScroll(latestId, streaming);
    if (!next) return;
    const timer = setTimeout(() => {
      const current = snapshot.current;
      if (
        !policy.current.following ||
        !current.latestId ||
        !current.visible.has(current.latestId)
      )
        return;
      policy.current.expectSelection(current.latestId);
      refresh();
    }, next.delay);
    return () => clearTimeout(timer);
  }, [latestId, following, streaming, selectedItemId]);

  const onSelectionChange = useCallback((id: string | null) => {
    const current = snapshot.current;
    const previousId = policy.current.selectedId;
    const wasFollowing = policy.current.following;
    policy.current.select(id, current.latestId, current.visible);
    if (
      previousId !== policy.current.selectedId ||
      wasFollowing !== policy.current.following
    )
      refresh();
  }, []);

  const resume = useCallback(() => {
    policy.current.resume();
    refresh();
  }, []);

  const toggle = useCallback(() => {
    if (policy.current.following) {
      const current = snapshot.current;
      const selected = policy.current.selection(
        current.latestId,
        current.visible,
      );
      if (selected) policy.current.selectedId = selected;
      policy.current.pause();
    } else policy.current.resume();
    refresh();
  }, []);

  const reset = useCallback(() => {
    policy.current = new FollowLatestPolicy();
    refresh();
  }, []);

  return {
    following,
    selectedItemId,
    onSelectionChange,
    resume,
    toggle,
    reset,
  };
}
