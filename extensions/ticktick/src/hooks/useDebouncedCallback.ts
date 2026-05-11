import { useEffect, useRef, useMemo } from "react";
import debounce from "lodash/debounce";

export default function useDebouncedCallback<T extends (...args: IntentionalAny[]) => void | Promise<void>>(
  callback: T,
  delay: number,
  deps: unknown[]
) {
  const callbackRef = useRef<T | undefined>();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  return useMemo(() => debounce((...args: unknown[]) => callbackRef.current?.(...args), delay), [delay]);
}
