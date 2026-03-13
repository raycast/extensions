import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { ReatomProvider } from "./ReatomProvider";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 minutes
      staleTime: 5 * 60 * 1000,
      // 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Retry delay that increases exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

// Provider wrapper component
export function QueryWrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ReatomProvider>{children}</ReatomProvider>
    </QueryClientProvider>
  );
}

export { queryClient };
