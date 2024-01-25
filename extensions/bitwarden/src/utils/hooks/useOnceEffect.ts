import { EffectCallback, useEffect, useRef } from "react";

type AsyncEffectCallback = () => Promise<any>;
type Effect = EffectCallback | AsyncEffectCallback;

/** `useEffect` that only runs once after the `condition` is met */
function useOnceEffect(effect: Effect, condition?: any) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    if (!condition) return;
    hasRun.current = true;
    void effect();
  }, [condition]);
}

export default useOnceEffect;
