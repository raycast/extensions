import { EffectCallback, useEffect, useRef, DependencyList } from "react";

/** `useEffect` that doesn't run on mount, only after. */
export default function useAfterMountEffect(effect: EffectCallback, deps?: DependencyList) {
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return effect();
    mounted.current = true;
  }, deps);
}
