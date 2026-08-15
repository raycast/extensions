import { useRef, useEffect } from "react";

type Timer = ReturnType<typeof setTimeout>;
type SomeFunction = (...args: unknown[]) => void;

export function useDebounce<Func extends SomeFunction>(func: Func, delay = 1000) {
  const timer = useRef<Timer>(undefined);

  useEffect(() => {
    return () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
    };
  }, []);

  const debouncedFunction = ((...args) => {
    const newTimer = setTimeout(() => {
      func(...args);
    }, delay);
    clearTimeout(timer.current);
    timer.current = newTimer;
  }) as Func;

  return debouncedFunction;
}
