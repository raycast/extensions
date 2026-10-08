import { getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { createContext, useContext, useState } from "react";
import { useEffect } from "react";

import { IVPN } from "@/api/ivpn";
import { IvpnInfoParsed } from "@/api/ivpn/types";
import { ConnectPayload, IvpnStatusSimplified } from "@/api/ivpn/types";
import { handleError } from "@/utils/errorHandler";

type IvpnConnectionContextType = {
  info: IvpnInfoParsed | undefined;
  isGettingInfo: boolean;
  revalidateInfo: () => Promise<IvpnInfoParsed>;
  switchingState: IvpnStatusSwitchState | null;
  connect: (payload?: ConnectPayload) => Promise<void>;
  disconnect: () => Promise<void>;
};

const IvpnConnectionContext = createContext<IvpnConnectionContextType | undefined>(undefined);

export function IvpnConnectionProvider({ children }: React.PropsWithChildren) {
  const {
    data: info,
    revalidate: revalidateInfo,
    isLoading: isGettingInfo,
    error,
  } = usePromise(IVPN.getStatus, [], { execute: false, onData: () => setSwitchingState(null) });

  const [switchingState, setSwitchingState] = useState<IvpnConnectionContextType["switchingState"]>(null);

  const { showErrorToast, ErrorComponent } = handleError(error, revalidateInfo);
  if (ErrorComponent) return <ErrorComponent />;
  showErrorToast?.();

  const connect = async (payload?: ConnectPayload) => {
    setSwitchingState("CONNECTING");
    await IVPN.connect(
      payload ?? {
        strategy: getPrefs().defaultConnectStrategy,
        protocol: getPrefs().preferredProtocol,
      },
    );
    await revalidateInfo();
  };

  const disconnect = async () => {
    setSwitchingState("DISCONNECTING");
    await IVPN.disconnect();
    await revalidateInfo();
  };

  return (
    <IvpnConnectionContext.Provider
      value={{
        info,
        isGettingInfo,
        switchingState,
        revalidateInfo,
        connect,
        disconnect,
      }}
    >
      {children}
    </IvpnConnectionContext.Provider>
  );
}

export type UseIvpnConnectionOptions = {
  onInit?: (ctx: IvpnConnectionContextType) => void;
};

type IvpnStatusSwitchState = "CONNECTING" | "DISCONNECTING";
export type IvpnStatusExtended = IvpnStatusSimplified | IvpnStatusSwitchState;

export function useIvpnConnection(options: UseIvpnConnectionOptions = {}) {
  const ctx = useContext(IvpnConnectionContext);
  if (!ctx) throw new Error("useIvpnConnection must be used within IvpnConnectionProvider");

  useEffect(() => {
    if (options.onInit) {
      options.onInit(ctx);
    } else {
      ctx.revalidateInfo();
    }
  }, []);

  return ctx;
}

// ---

const getPrefs = () => getPreferenceValues<Preferences>();
