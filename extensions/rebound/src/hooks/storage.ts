import { LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import React from "react";
import { StorageKeyType, StorageValue } from "../types/storage";
import { isJson } from "../utils/storage";
import { useControllableState } from "./controllable";
import Value = LocalStorage.Value;

// eslint-disable-next-line no-extend-native
Date.prototype.toJSON = function toJSON() {
  return JSON.stringify({ $date: this.toISOString() });
};

function reviver(key: string, value: unknown) {
  if (typeof value === "string" && isJson(value)) {
    const valueObject = JSON.parse(value);

    if (Object.hasOwn(valueObject, "$date")) {
      return new Date(valueObject.$date);
    }
  }

  return value;
}

export function useStorage<T extends StorageValue = StorageValue>(
  key: StorageKeyType,
  initialValue?: T,
  options: {
    parse: boolean;
  } = { parse: true },
): {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  removeValue: () => Promise<void>;
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const { value: rawValue, setValue: setRawValue, removeValue, isLoading } = useLocalStorage<Value>(key);
  const [internalValue, internalSetValue] = useControllableState<Value>({
    value: rawValue,
    onChange: setRawValue,
  });

  const parseValue = (value?: Value): T => {
    if (!options.parse) {
      return (value ?? initialValue) as T;
    }

    if (value == null || typeof value !== "string") {
      return initialValue ?? ({} as T);
    }

    return JSON.parse(value as string, reviver) as T;
  };

  const setValue = (value: T) => {
    const parsedValue = options.parse ? JSON.stringify(value) : (value as unknown as Value);
    return internalSetValue(parsedValue);
  };

  return {
    value: parseValue(internalValue),
    setValue: (next: React.SetStateAction<T>) => {
      const nextValue = typeof next === "function" ? next(parseValue(internalValue)) : next;
      return setValue(nextValue);
    },
    removeValue,
    isLoading,
    refetch: () =>
      LocalStorage.getItem(key).then((value) => {
        if (value) {
          internalSetValue(parseValue(value) as Value);
        }
      }),
  };
}
