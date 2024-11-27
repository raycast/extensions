import { DependencyList, useEffect } from "react";

type EffectCallback = () => Promise<void>;

export function useAsyncEffect(effect: EffectCallback, deps?: DependencyList) {
  useEffect(() => {
    void effect();
  }, deps);
}
