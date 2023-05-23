import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const QueryGuard: React.FC<{ component: React.FC }> = ({ component: Component }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>
  );
};

export const withQuery =
  (Component: React.FC): React.FC =>
  () =>
    <QueryGuard component={Component} />;
