import { Detail } from "@raycast/api";

import { IvpnConnectionProvider, useIvpnConnection } from "@/contexts/IvpnConnectionContext";
import { ConnectionInfo } from "@/views/connection-info";

export default () => (
  <IvpnConnectionProvider>
    <VerboseToggle />
  </IvpnConnectionProvider>
);

function VerboseToggle() {
  const { info, connect, disconnect } = useIvpnConnection();

  if (!info) return <Detail isLoading={true} />;

  const toggle = async () => {
    if (info.vpnStatus === "CONNECTED") {
      disconnect();
    } else {
      connect();
    }
  };

  return <ConnectionInfo initialTrigger={toggle} />;
}
