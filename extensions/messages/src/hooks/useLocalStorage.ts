import { LocalStorage } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";

export type UseLocalStorageReturnValue<T> = {
  value: T;
  setValue: (value: T) => Promise<void>;
  removeValue: () => Promise<void>;
  isLoading: boolean;
};

export function useLocalStorage<T>(key: string, initialValue: T): UseLocalStorageReturnValue<T> {
  const {
    data: value,
    isLoading,
    mutate,
  } = useCachedPromise(
    async (storageKey: string) => {
      const item = await LocalStorage.getItem<string>(storageKey);

      if (item) {
        return JSON.parse(item);
      }
    },
    [key],
  );

  async function setValue(value: T) {
    try {
      await mutate(LocalStorage.setItem(key, JSON.stringify(value)), {
        optimisticUpdate() {
          return value;
        },
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to set value in local storage" });
    }
  }

  async function removeValue() {
    try {
      await mutate(LocalStorage.removeItem(key), {
        optimisticUpdate() {
          return undefined;
        },
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to remove value from local storage" });
    }
  }

  return { value: value ?? initialValue, setValue, removeValue, isLoading };
}
