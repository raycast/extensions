import { useState, useCallback } from "react";

export function useForceRenderer(): readonly [number, () => void] {
  const [didRerender, _forceRerender] = useState(0);

  const forceRerender = useCallback(() => {
    _forceRerender((x) => x + 1);
  }, [_forceRerender]);

  return [didRerender, forceRerender] as const;
}
