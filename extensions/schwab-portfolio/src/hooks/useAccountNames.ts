import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getAccountNicknames } from "../lib/schwab-client";
import { getAccountAliases } from "../lib/account-aliases";

/**
 * Display names per account number: nicknames from schwab.com, overridden by
 * the optional Account Aliases preference.
 */
export function useAccountNames(): Record<string, string> {
  const { data: nicknames } = useCachedPromise(() => getAccountNicknames(), [], { keepPreviousData: true });
  return useMemo(() => ({ ...(nicknames ?? {}), ...getAccountAliases() }), [nicknames]);
}
