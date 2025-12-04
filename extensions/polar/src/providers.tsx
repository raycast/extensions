import React, { createContext, PropsWithChildren } from "react";
import { buildPolarClient } from "./polar";
import { Polar } from "@polar-sh/sdk";
import { QueryCache, QueryClient } from "@tanstack/react-query";

// @ts-expect-error Throw if PolarContext is not set
export const PolarContext = createContext<Polar>(() => {
  throw new Error("PolarContext not set");
});

export const PolarProvider = ({
  children,
  accessToken,
}: PropsWithChildren<{ accessToken: string | undefined }>) => {
  return (
    <PolarContext.Provider value={buildPolarClient(accessToken)}>
      {children}
    </PolarContext.Provider>
  );
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error("QueryClient error", error);
    },
  }),
});
