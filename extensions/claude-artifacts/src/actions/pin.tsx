import { Action, Icon, Keyboard, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

/**
 * Pinned artifact ids, newest pin first.
 *
 * Stored in LocalStorage rather than written back into `~/.claude/artifacts.json`:
 * the index is owned by the hook, which rewrites rows on every publish, so a
 * `pinned` field added there would be silently dropped. Pins are also a view
 * preference, not a property of the artifact.
 *
 * Ids of artifacts that later leave the index are kept rather than pruned —
 * membership is a `Set` lookup, so a stale id costs nothing, and dropping it
 * would lose the pin if the row ever comes back (a republished artifact keeps
 * its id).
 */
const PINS_KEY = "pinned-artifact-ids";

async function readPins(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(PINS_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    // Hand-edited or half-written storage must not throw on launch; an
    // unreadable pin list is the same outcome as an empty one.
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Serializes read-modify-write, so two toggles fired before a rerender cannot
 * both compute from the same array and lose the first write.
 *
 * ponytail: module-level chain, fine because a command runs in one process and
 * this is the only writer. Move to a keyed queue if anything else starts
 * writing this key.
 */
let pending: Promise<unknown> = Promise.resolve();

function toggleStoredPin(id: string): Promise<string[]> {
  const result = pending.then(async () => {
    const current = await readPins();
    const next = current.includes(id) ? current.filter((pinnedId) => pinnedId !== id) : [id, ...current];
    await LocalStorage.setItem(PINS_KEY, JSON.stringify(next));
    return next;
  });

  // Sequence the NEXT toggle behind this one whether or not it succeeded. A
  // rejected `pending` would otherwise wedge the chain permanently: every
  // later `.then` callback is skipped, so pinning silently stops working for
  // the rest of the session even after storage recovers.
  //
  // `result` itself stays rejectable, so `mutate` still sees the failure and
  // rolls its optimistic update back.
  pending = result.catch(() => undefined);

  return result;
}

/**
 * `useCachedPromise`, not `useLocalStorage`, for the same reason the hook-status
 * read uses it: `useLocalStorage` reports `undefined` until its async read
 * resolves, which is indistinguishable from "nothing is pinned" — so every
 * launch would paint pinned rows down in the unpinned section and then jump
 * them to the top. The cache supplies the previous launch's value on the first
 * frame; LocalStorage remains the durable truth, so a cache eviction costs one
 * flicker rather than the pins themselves.
 *
 * ponytail: `initialData` still renders before the FIRST-ever read resolves, so
 * that one reorder survives on the launch right after upgrading and after a
 * cache eviction. Not gated behind `isLoading`, because `useCachedPromise`
 * reports loading during every background revalidation too — blanking the list
 * on every single launch to spare one frame on the rare one is the worse trade.
 */
export function usePins() {
  const { data: order = [], mutate } = useCachedPromise(readPins, [], {
    initialData: [] as string[],
    keepPreviousData: true,
  });

  const pinned = new Set(order);

  return {
    pinned,
    togglePin: (id: string) =>
      mutate(toggleStoredPin(id), {
        optimisticUpdate: (current = []) =>
          current.includes(id) ? current.filter((pinnedId) => pinnedId !== id) : [id, ...current],
        // No re-read afterwards. A revalidation triggered by an EARLIER toggle
        // resolves while a later one is still queued, publishing storage as it
        // was mid-chain — so pinning two artifacts in quick succession made the
        // second visibly drop back to the unpinned section before reappearing.
        // The optimistic update applies the same transformation the queue does,
        // and nothing outside this command writes the key, so they converge
        // without one.
        shouldRevalidateAfter: false,
      }),
  };
}

export function PinAction({ id, pinned, togglePin }: { id: string; pinned: boolean; togglePin: (id: string) => void }) {
  return (
    <Action
      title={pinned ? "Unpin Artifact" : "Pin Artifact"}
      icon={pinned ? Icon.TackDisabled : Icon.Tack}
      shortcut={Keyboard.Shortcut.Common.Pin}
      onAction={() => togglePin(id)}
    />
  );
}
