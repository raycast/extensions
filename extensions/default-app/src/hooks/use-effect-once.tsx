import { EffectCallback, useEffect } from "react";

export function useEffectOnce(callback: EffectCallback) {
  useEffect(() => {
    callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
