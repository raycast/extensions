import { useEffect, useState } from "react";

const DEFAULT_DELAY = 200;

export type UseDebouncedStateResult<T> = [T | undefined, T | undefined, (state: T) => void];

export const useDebouncedState = <T = unknown>(initialValue?: T, delay = DEFAULT_DELAY): UseDebouncedStateResult<T> => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
    setDebouncedValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [delay, value]);

  return [value, debouncedValue, setValue];
};
