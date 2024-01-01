import { mullvadNotInstalledHint } from "./utils";
import { Detail } from "@raycast/api";
import { useExec } from "@raycast/utils";

export default function Command() {
  const isMullvadInstalled = useExec("mullvad", ["version"]);
  const connectionStatus = useExec("mullvad", ["status"], { execute: !!isMullvadInstalled.data });

  if (connectionStatus.isLoading || isMullvadInstalled.isLoading) return <Detail isLoading={true} />;
  if (!isMullvadInstalled.data || isMullvadInstalled.error) return <Detail markdown={mullvadNotInstalledHint} />;

  return <Detail markdown={connectionStatus.data} />;
}
