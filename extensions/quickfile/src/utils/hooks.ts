import { showToast, Toast, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export const useAsyncData = <T = any, I extends string | string[] | number[] = string>(
  _key: I,
  fetcher: (key: I) => Promise<T>
) => {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>();

  const key: string = Array.isArray(_key) ? _key.join(",") : _key;
  useEffect(() => {
    if (!key) return;

    Promise.any([
      LocalStorage.getItem(key).then((storedValue: unknown) => {
        if (!storedValue || typeof storedValue !== "string") return;
        return JSON.parse(storedValue) as T;
      }),
      fetcher(_key)
        .then((value) => {
          LocalStorage.setItem(key, JSON.stringify(value));
          setData(value);
          return value;
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
};
