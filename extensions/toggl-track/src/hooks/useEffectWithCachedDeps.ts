import { useRef, useEffect, EffectCallback } from "react";

/**
 * A wrapper for chached dependencies passed to `useEffect`.
 *
 * The returned dependencies will only trigger the `effect` when their value is changed.
 */
export function useEffectWithCachedDeps<T>(
  effect: EffectCallback,
  deps: readonly T[],
  isEqual: (original: T, updated: T) => boolean,
) {
  const ref = useRef(deps);
  useEffect(() => {
    if (!ref.current.every((original, i) => isEqual(original, deps[i]))) {
      ref.current = deps;
      effect();
    }
  }, deps);
}
