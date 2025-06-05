import { useState } from "react";

export type BaseConverter = {
  get: (base: number, id?: number) => string;
  set: (base: number, value: string, prefix?: string, id?: number) => void;
  reset: () => void;
};

type Override = { base: number; value: string; id: number };
export default function useBaseConverter(): BaseConverter {
  const [value, setValue] = useState<null | bigint>(null);
  const [override, setOverride] = useState<null | Override>(null);

  const get = (base: number, id: number = 0): string => {
    if (override !== null && override.base == base && override.id == id) {
      return override.value;
    }
    return value?.toString(base) ?? "";
  };

  const set = (base: number, value: string, prefix?: string, id: number = 0) => {
    setOverride({ base, value, id });
    value = value.trim();
    if (prefix && value.startsWith(prefix)) {
      value = value.substring(prefix.length);
    }
    setValue(parseBigInt(value, base));
  };

  const reset = () => {
    setValue(null);
    setOverride(null);
  };
  return { get, set, reset };
}

export const parseBigInt = (string: string, radix: number): bigint | null => {
  if (string.length == 0) {
    return null;
  }
  let value = BigInt(0);
  for (const char of string) {
    const digit = parseInt(char, radix);
    if (isNaN(digit)) {
      return null;
    }
    value = value * BigInt(radix) + BigInt(digit);
  }
  return value;
};
