import { ComponentType } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query";

export function withQueryClient<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  return function Wrapped(props: P) {
    return (
      <QueryClientProvider client={queryClient}>
        <Component {...props} />
      </QueryClientProvider>
    );
  };
}
