import { LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";

type UseLocalStorageActions = {
  isLoading: boolean;
  set: (value: string) => Promise<void>;
  remove: () => Promise<void>;
};

/** Reading and writing a single item in local storage. */
export function useLocalStorageItem(key: string): [string | undefined, UseLocalStorageActions];
export function useLocalStorageItem(key: string, defaultValue: string): [string, UseLocalStorageActions];
export function useLocalStorageItem(key: string, defaultValue?: string) {
  const { data: value, revalidate, isLoading } = usePromise(() => LocalStorage.getItem<string>(key));

  const set = async (value: string) => {
    await LocalStorage.setItem(key, value);
    await revalidate();
  };

  const remove = async () => {
    await LocalStorage.removeItem(key);
    await revalidate();
  };

  return [value ?? defaultValue, { isLoading, set, remove }] as const;
}
