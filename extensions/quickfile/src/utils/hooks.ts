import { showToast, Toast, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export function useAsyncData<T = any, I extends string | Array<string | number> = string>(
  source: I,
  fetcher: (source: I) => Promise<T>
): { data: T | undefined; error: any; loading: boolean };
export function useAsyncData<T = any, I extends string | Array<string | number> = string>(
  source: I,
  fetcher: (source: I) => Promise<T>,
  initialValue: T
): { data: T; error: any; loading: boolean };
export function useAsyncData<T = any, I extends string | Array<string | number> = string>(
  source: I,
  fetcher: (source: I) => Promise<T>,
  initialValue?: T
) {
  const [data, setData] = useState<T>(initialValue as T);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>();

  const key: string = Array.isArray(source) ? source.join(",") : source;
  useEffect(() => {
    if (!key) return;

    Promise.any([
      LocalStorage.getItem(key).then((storedValue: unknown) => {
        if (!storedValue || typeof storedValue !== "string") return;
        return JSON.parse(storedValue) as T;
      }),
      fetcher(source)
        .then((value) => {
          LocalStorage.setItem(key, JSON.stringify(value));
          setData(value);
        })
        .catch((err) => setError(err))
        .finally(() => setLoading(false)),
    ]).then((d) => d && setData(d));
  }, [key]);

  useEffect(() => {
    if (!error) return;

    showToast({
      style: Toast.Style.Failure,
      title: "Problem fetching data from the QuickFile API.",
      message: error.message,
    });
  }, [error]);

  return { data, error, loading };
}
