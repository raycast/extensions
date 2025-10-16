import fetch from "cross-fetch";
import { useRefreshableCachedState } from "./use-refreshable-cached-state";

export type KeyCodes = Map<string, string>;

interface IncomingKeyCodes {
  keyCodes: [string, string][];
}

const cacheKey = "key-codes";

interface UseKeyCodesResult {
  isLoading: boolean;
  data: Map<string, string> | undefined;
  revalidate: () => void;
}

export default function useKeyCodes(): UseKeyCodesResult {
  return useRefreshableCachedState<IncomingKeyCodes, Map<string, string> | undefined>(
    cacheKey,
    async () => {
      console.log("Fetching key codes");
      const res = await fetch("https://hotkys.com/data/key-codes.json");
      const json: IncomingKeyCodes = await res.json();
      return json;
    },
    {
      dataParser: (incomingKeyCodes: IncomingKeyCodes | undefined) =>
        incomingKeyCodes ? new Map<string, string>(incomingKeyCodes.keyCodes) : undefined,
    }
  );
}
