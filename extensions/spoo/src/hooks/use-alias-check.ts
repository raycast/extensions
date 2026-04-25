import { useEffect, useState } from "react";
import { usePromise } from "@raycast/utils";
import { checkAlias } from "@/api/urls";
import { DEBOUNCE_MS } from "@/constants";
import type { AliasAvailability } from "@/schemas/url";

interface UseAliasCheckResult {
  availability: AliasAvailability | undefined;
  isChecking: boolean;
  error: string | undefined;
}

export function useAliasCheck(alias: string): UseAliasCheckResult {
  const [debounced, setDebounced] = useState(alias);

  useEffect(() => {
    const handle = setTimeout(
      () => setDebounced(alias),
      DEBOUNCE_MS.aliasCheck,
    );
    return () => clearTimeout(handle);
  }, [alias]);

  const trimmed = debounced.trim();
  const shouldCheck = trimmed.length >= 3;

  const { data, isLoading } = usePromise(
    async (value: string) => (value ? checkAlias(value) : undefined),
    [trimmed],
    { execute: shouldCheck },
  );

  const error = describeError(data, shouldCheck);

  return { availability: data, isChecking: isLoading, error };
}

function describeError(
  avail: AliasAvailability | undefined,
  shouldCheck: boolean,
): string | undefined {
  if (!shouldCheck || !avail || avail.available) return undefined;
  switch (avail.reason) {
    case "taken":
      return "This alias is already taken.";
    case "format":
      return "Only letters, numbers, hyphens, and underscores allowed.";
    case "length":
      return "Alias must be between 3 and 16 characters.";
    default:
      return "This alias is unavailable.";
  }
}
