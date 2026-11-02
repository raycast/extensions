import { useLayoutEffect, useRef } from "react";

type Callback = (...args: never[]) => unknown;
type Slot = { callback?: Callback; handle: Callback };

function createSlot(): Slot {
  // This closure must not share the result view's scope or callback arguments.
  const slot: Slot = { handle: (...args) => slot.callback?.(...args) };
  return slot;
}

/** Native controls may outlive a view in DevTools; leave them only inert handles. */
export function useEventHandles() {
  const slots = useRef(new Map<string, Slot>());
  const callbacks = new Map<Slot, Callback>();
  useLayoutEffect(() => {
    for (const [slot, callback] of callbacks) slot.callback = callback;
    return () => {
      for (const slot of callbacks.keys()) slot.callback = undefined;
    };
  });
  return <T extends Callback | undefined>(name: string, callback: T): T => {
    if (!callback) return callback;
    let slot = slots.current.get(name);
    if (!slot) {
      slot = createSlot();
      slots.current.set(name, slot);
    }
    callbacks.set(slot, callback);
    return slot.handle as T;
  };
}
