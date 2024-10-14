import { useEffect, useRef, useState } from "react";

const BlockUseEffectTwiceHook = (func: () => Promise<void>) => {
  const hook = useRef(true);
  const [state, setState] = useState(0);

  useEffect(() => {
    setState(state + 1);
  }, []);

  useEffect(() => {
    if (hook.current) {
      func();
      hook.current = false;
    }
  }, [state]);

  return { state };
};

export default BlockUseEffectTwiceHook;
