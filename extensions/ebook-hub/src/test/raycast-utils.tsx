/** Test double for `@raycast/utils`: small, faithful versions of the hooks Ebook Hub uses. */
import { useCallback, useEffect, useRef, useState } from "react";

import { Toast, showToast } from "./raycast-api";

export async function showFailureToast(error: unknown, options?: { title?: string }) {
  return showToast({
    style: Toast.Style.Failure,
    title: options?.title ?? "Something went wrong",
    message: error instanceof Error ? error.message : String(error),
  });
}

interface PromiseState<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
}

interface PromiseOptions {
  execute?: boolean;
  keepPreviousData?: boolean;
}

export function usePromise<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>,
  args: Args,
  options: PromiseOptions = {},
) {
  const execute = options.execute ?? true;
  const [state, setState] = useState<PromiseState<T>>({ data: undefined, error: undefined, isLoading: execute });
  const [version, setVersion] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!execute) {
      setState((current) => ({ ...current, isLoading: false }));
      return;
    }
    let cancelled = false;
    setState((current) => ({ ...current, isLoading: true }));
    fnRef.current(...args).then(
      (data) => {
        if (!cancelled) {
          setState({ data, error: undefined, isLoading: false });
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          const normalized = error instanceof Error ? error : new Error(String(error));
          setState((current) => ({ data: current.data, error: normalized, isLoading: false }));
          void showFailureToast(normalized);
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // Re-run exactly when the caller's arguments change, like @raycast/utils.
  }, [...args, version, execute]);

  const revalidate = useCallback(() => setVersion((current) => current + 1), []);
  return { ...state, revalidate };
}

export const useCachedPromise = usePromise;

export enum FormValidation {
  Required = "required",
}

type Validator<V> = ((value: V | undefined) => string | undefined | null) | FormValidation;

interface UseFormOptions<T extends object> {
  initialValues: T;
  validation?: { [K in keyof T]?: Validator<T[K]> };
  onSubmit: (values: T) => unknown;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

export function useForm<T extends object>({ initialValues, validation = {}, onSubmit }: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const keys = Object.keys(initialValues) as (keyof T)[];

  function validate(current: T): Partial<Record<keyof T, string>> {
    const found: Partial<Record<keyof T, string>> = {};
    for (const key of Object.keys(validation) as (keyof T)[]) {
      const rule = validation[key];
      const message =
        rule === FormValidation.Required
          ? isEmpty(current[key])
            ? "The item is required"
            : undefined
          : rule?.(current[key]);
      if (message) {
        found[key] = message;
      }
    }
    return found;
  }

  async function handleSubmit() {
    const current = valuesRef.current;
    const found = validate(current);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return false;
    }
    await onSubmit(current);
    return true;
  }

  const itemProps = Object.fromEntries(
    keys.map((key) => [
      key,
      {
        id: String(key),
        value: values[key],
        error: errors[key],
        onChange: (value: T[typeof key]) => {
          setValues((current) => ({ ...current, [key]: value }));
          setErrors((current) => ({ ...current, [key]: undefined }));
        },
      },
    ]),
  ) as unknown as { [K in keyof T]: { id: string; value: T[K]; error?: string; onChange: (value: T[K]) => void } };

  return {
    handleSubmit,
    itemProps,
    values,
    setValue: <K extends keyof T>(key: K, value: T[K]) => setValues((current) => ({ ...current, [key]: value })),
    setValidationError: (key: keyof T, error: string | undefined | null) =>
      setErrors((current) => ({ ...current, [key]: error ?? undefined })),
  };
}
