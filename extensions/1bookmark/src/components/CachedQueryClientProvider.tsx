import { QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "../utils/trpc.util.js";
import { getQueryClient, getTrpcClient, setToken } from "../utils/client.util.js";
import { useCachedState, useLocalStorage } from "@raycast/utils";
import { useEffect } from "react";
import { CACHED_KEY_SESSION_TOKEN } from "../utils/constants.util.js";

export function CachedQueryClientProvider({ children }: { children: React.ReactNode }) {
  const [sessionToken, setSessionToken] = useCachedState(CACHED_KEY_SESSION_TOKEN, "");
  const queryClient = getQueryClient();
  const trpcClient = getTrpcClient(setSessionToken);

  useEffect(() => {
    setToken(sessionToken);
  }, [sessionToken]);

  // Compatibility with old cached sessionToken.
  const { value, removeValue } = useLocalStorage("sessionToken", "");
  useEffect(() => {
    if (!value) return;

    setSessionToken(value);
    setToken(value);
    removeValue();
  }, [value]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
