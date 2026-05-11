import { useCachedPromise } from "@raycast/utils";
import { PropsWithChildren, createContext, useContext, useState } from "react";

import { IVPN } from "@/api/ivpn";
import { IvpnNotLoggedInError } from "@/api/ivpn/errors";

export type IvpnAccountInfo = Awaited<ReturnType<typeof IVPN.getAccountInfo>>;

type IvpnAccountInfoContextType = {
  accountInfo?: IvpnAccountInfo;
  accountInfoError?: Error;
  isAuthenticated: boolean;
  isGettingAccountInfo: boolean;
  refreshAccountInfo: () => void;
} | null;

const IvpnAccountInfoContext = createContext<IvpnAccountInfoContextType>(null);

export function IvpnAccountInfoProvider({ children }: PropsWithChildren) {
  const {
    data: accountInfo,
    error: accountInfoError,
    isLoading: isGettingAccountInfo,
    revalidate: refreshAccountInfo,
  } = useCachedPromise(IVPN.getAccountInfo, [], {
    keepPreviousData: true,
    onError: (err) => {
      if (err instanceof IvpnNotLoggedInError) {
        setIsAuthenticated(false);
      }
    },
  });

  const [isAuthenticated, setIsAuthenticated] = useState(!!accountInfo);

  return (
    <IvpnAccountInfoContext.Provider
      value={{
        accountInfo: isAuthenticated ? accountInfo : undefined,
        accountInfoError,
        isAuthenticated: isAuthenticated,
        isGettingAccountInfo,
        refreshAccountInfo,
      }}
    >
      {children}
    </IvpnAccountInfoContext.Provider>
  );
}

export function useIvpnAccountInfo() {
  const ctx = useContext(IvpnAccountInfoContext);

  if (!ctx) throw new Error("useIvpnAccountInfo must be used within IvpnAccountInfoProvider");

  return ctx;
}
