/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { vi } from "vitest";

import { cache } from "./raycast";

export const useFetch = vi.fn((): any => ({ data: [], isLoading: false, pagination: undefined }));
export const getAvatarIcon = vi.fn((name: string) => name);
export function useCachedState(key: string, initial: any) {
  return useState(cache.get(key) ?? initial);
}
export function useForm<T extends Record<string, any>>(options: any) {
  const [values, setValues] = useState<T>(options.initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const itemProps: any = {};
  for (const key of Object.keys(values))
    itemProps[key] = {
      id: key,
      value: values[key],
      error: errors[key],
      onChange: (value: any) => setValues((previous) => ({ ...previous, [key]: value })),
    };
  return {
    itemProps,
    setValue: (key: string, value: any) => setValues((previous) => ({ ...previous, [key]: value })),
    handleSubmit: async () => {
      const next: Record<string, string> = {};
      for (const [key, validation] of Object.entries(options.validation ?? {})) {
        const error = (validation as any)(values[key]);
        if (error) next[key] = error;
      }
      setErrors(next);
      if (Object.keys(next).length === 0) await options.onSubmit(values);
    },
  };
}
