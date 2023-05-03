import { EffectCallback, useEffect, useRef } from "react";

function useOnceEffect(effect: EffectCallback, condition?: any) {
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current) return;
    if (!condition) return;

    ref.current = true;
    return effect();
  }, [condition]);
}

export default useOnceEffect;
