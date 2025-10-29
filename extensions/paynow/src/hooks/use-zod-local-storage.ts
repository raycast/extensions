import { useLocalStorage } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import type { ZodType } from "zod";

type LocalStorage<T> = undefined extends T
  ? ReturnType<typeof useLocalStorage<T>>
  : Omit<ReturnType<typeof useLocalStorage<T>>, "value"> & {
      value: T;
    };

type ZodLocalStorage<T> = LocalStorage<T> & {
  isValid: boolean;
  rawValue: unknown;
};

export function useZodLocalStorage<T>(
  key: string,
  schema: ZodType<T>,
  initialValue?: undefined,
): ZodLocalStorage<T | undefined>;
export function useZodLocalStorage<T>(key: string, schema: ZodType<T>, initialValue: T): ZodLocalStorage<T>;
export function useZodLocalStorage<T>(key: string, schema: ZodType<T>, initialValue?: T) {
  const localStorage = useLocalStorage<T>(key, initialValue);
  const parsed = useMemo(() => {
    if (localStorage.isLoading) return { success: true, data: initialValue };
    return schema.safeParse(localStorage.value);
  }, [initialValue, localStorage.isLoading, localStorage.value, schema]);

  const setValue = useCallback(
    async (newValue: T) => {
      if (localStorage.isLoading) {
        return;
      }
      const parsed = schema.safeParse(newValue);
      if (parsed.success) {
        return await localStorage.setValue(parsed.data);
      } else {
        console.warn("Attempted to set invalid value in useZodLocalStorage:", parsed.error);
      }
    },
    [localStorage, schema],
  );

  return {
    ...localStorage,
    setValue,
    value: parsed.success ? parsed.data : initialValue,
    isValid: parsed.success,
    rawValue: localStorage.value,
  };
}
