import { useFetch } from "@raycast/utils";

export type KeyCodes = Record<string, string>;

interface IncomingKeyCodes {
  keyCodes: [string, string][];
}

interface UseKeyCodesResult {
  isLoading: boolean;
  data: KeyCodes | undefined;
  revalidate: () => void;
}

export default function useKeyCodes(): UseKeyCodesResult {
  const { isLoading, data, revalidate } = useFetch<IncomingKeyCodes, undefined, KeyCodes>(
    "https://hotkys.com/data/key-codes.json",
    {
      mapResult: (result) => ({
        data: Object.fromEntries(result.keyCodes),
      }),
      failureToastOptions: {
        title: "Failed to load key codes",
      },
    }
  );

  return {
    isLoading,
    data,
    revalidate,
  };
}
