import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const QueryGuard = ({ children }: React.PropsWithChildren) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export const withQuery =
  <T extends Record<string, unknown>>(Component: React.ComponentType<T>) =>
  (props: T) => (
    <QueryGuard>
      <Component {...props} />
    </QueryGuard>
  );
