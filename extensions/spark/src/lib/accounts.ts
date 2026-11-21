import { useCachedPromise } from "@raycast/utils";
import { accountColors } from "./colors";
import { sparkJSON } from "./spark";
import { AccountsResult } from "./types";

export { rowColor } from "./colors";

export function useAccountColors(): Map<string, string> {
  const { data } = useCachedPromise(() => sparkJSON<AccountsResult>(["accounts"]), [], {
    keepPreviousData: true,
    onError: () => undefined,
  });
  return accountColors(data);
}
