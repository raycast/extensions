import { LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";

type LocalStorageItemActions = {
  isLoading: boolean;
  set: (value: string) => Promise<void>;
  remove: () => Promise<void>;
};

/** Read and manage a single item in LocalStorage. */
export function useLocalStorageItem(key: string): [string | undefined, LocalStorageItemActions];
export function useLocalStorageItem(key: string, defaultValue: string): [string, LocalStorageItemActions];
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
