import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { showFailureToast } from "@raycast/utils";
import type { ComponentType } from "react";

const queryCache = new QueryCache({
  onError: (error, query) => {
    // If query provides meta.errorMessage, handle it globally here
    // Otherwise, the component needs to handle the error itself (e.g. via useEffect)
    const errorMessage = (query.meta as { errorMessage?: string } | undefined)?.errorMessage;
    if (errorMessage) {
      showFailureToast(error, { title: errorMessage });
    }
  },
});

const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default function withQuery<P extends object>(Component: ComponentType<P>) {
  return function WrappedComponent(props: P) {
    return (
      <QueryClientProvider client={queryClient}>
        <Component {...props} />
      </QueryClientProvider>
    );
  };
}
