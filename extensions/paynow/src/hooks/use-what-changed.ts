import { useEffect, useRef } from "react";

const initialValue = Symbol("initial");

export const useWhatChanged = (name: string, value: unknown) => {
  const previousValue = useRef<unknown>(initialValue);

  useEffect(() => {
    if (previousValue.current === initialValue) {
      previousValue.current = value;
      return;
    }
    if (previousValue.current !== value) {
      console.log(`[useWhatChanged] ${name} changed:`, {
        from: previousValue.current,
        to: value,
      });
      previousValue.current = value;
    }
  }, [name, value]);
};
