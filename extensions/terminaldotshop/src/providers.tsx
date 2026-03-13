import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { provider } from "./hooks/auth";
import { withAccessToken } from "@raycast/utils";
import { ReactNode } from "react";

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: (e, c) => {
        console.log(`[${c.queryKey.join(",")}]`, e.message);
        return false;
      },
    },
  },
});

export const withQc = (child: React.ReactNode) => <QueryClientProvider client={qc}>{child}</QueryClientProvider>;

export const wrap = (child: ReactNode) => {
  return withAccessToken(provider)(() => <QueryClientProvider client={qc}>{child}</QueryClientProvider>);
};
