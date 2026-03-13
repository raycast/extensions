import { useCachedState, useLocalStorage } from "@raycast/utils";
import { useEffect } from "react";
import { StorageKey } from "../types/storage";
import { StructuredStorage } from "../utils/storage";

export function useStructuredStorage<T extends StructuredStorage.Value>(
  key: string,
  initialValue: T,
): {
  value: T;
  setValue: (value: T) => Promise<void>;
  removeValue: () => Promise<void>;
  isLoading: boolean;
};
export function useStructuredStorage<T extends StructuredStorage.Value>(
  key: string,
): {
  value: T | undefined;
  setValue: (value: T) => Promise<void>;
  removeValue: () => Promise<void>;
  isLoading: boolean;
};
export function useStructuredStorage<T extends StructuredStorage.Value>(key: string, initialValue?: T) {
  const {
    value,
    setValue: setRawValue,
    removeValue,
    isLoading,
  } = useLocalStorage(key, initialValue ? StructuredStorage.serialize(initialValue) : undefined);

  return {
    value: value ?? initialValue,
    setValue: async (value: T) => {
      await setRawValue(StructuredStorage.serialize(value));
    },
    removeValue,
    isLoading,
  };
}

export function useCachedStorage<T extends StructuredStorage.Value>(
  key: StorageKey,
  initialValue: T,
): [T, (newState: T | ((previousState: T) => T)) => void];
export function useCachedStorage<T extends StructuredStorage.Value>(
  key: StorageKey,
): [T | undefined, (newState: T | ((previousState: T | undefined) => T)) => void];
export function useCachedStorage<T extends StructuredStorage.Value>(key: StorageKey, initialValue?: T) {
  const [state, setState] = useCachedState(key, initialValue);

  useEffect(() => {
    if (state === undefined) {
      StructuredStorage.removeItem(key).then();
    } else {
      StructuredStorage.setItem(key, state).then();
    }
  }, [state]);

  return [state, setState];
}
