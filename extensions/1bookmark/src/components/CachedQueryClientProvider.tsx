import { QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "../utils/trpc.util.js";
import { getQueryClient, getTrpcClient, setToken } from "../utils/client.util.js";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { CACHED_KEY_SESSION_TOKEN } from "../utils/constants.util.js";

interface CachedQueryClientProviderProps {
  children: React.ReactNode;
  launchContext?: { token?: string };
}

export function CachedQueryClientProvider({ children, launchContext }: CachedQueryClientProviderProps) {
  const [sessionToken, setSessionToken] = useCachedState(CACHED_KEY_SESSION_TOKEN, "");
  const queryClient = getQueryClient();
  const trpcClient = getTrpcClient(setSessionToken);

  // Save token received from deeplink
  useEffect(() => {
    if (launchContext?.token) {
      setSessionToken(launchContext.token);
      setToken(launchContext.token);
    }
  }, [launchContext?.token]);

  useEffect(() => {
    setToken(sessionToken);
  }, [sessionToken]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
