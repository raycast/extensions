import { IvpnConnectionProvider } from "@/contexts/IvpnConnectionContext";
import { ConnectionInfo } from "@/views/connection-info";

export default () => (
  <IvpnConnectionProvider>
    <ConnectionInfo />
  </IvpnConnectionProvider>
);
