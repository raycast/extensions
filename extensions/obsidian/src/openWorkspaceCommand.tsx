import { List } from "@raycast/api";

import { VaultSelection } from "./components/VaultSelection";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import AdvancedURIPluginNotInstalled from "./components/Notifications/AdvancedURIPluginNotInstalled";
import { noVaultPathsToast } from "./components/Toasts";
import { useObsidianVaults, useVaultPluginCheck } from "./utils/hooks";
import { ObsidianVault } from "@/obsidian";
import WorkspacesList from "./components/WorkspacesList";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();

  const { vaultsWithPlugin } = useVaultPluginCheck({
    vaults: vaults,
    communityPlugins: ["obsidian-advanced-uri"],
    corePlugins: ["workspaces"],
  });

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  }

  if (vaultsWithPlugin.length === 0) {
    return <AdvancedURIPluginNotInstalled />;
  }

  if (vaultsWithPlugin.length > 1) {
    return (
      <VaultSelection vaults={vaultsWithPlugin} target={(vault: ObsidianVault) => <WorkspacesList vault={vault} />} />
    );
  } else if (vaultsWithPlugin.length === 1) {
    return <WorkspacesList vault={vaultsWithPlugin[0]} />;
  } else {
    noVaultPathsToast();
    return <List />;
  }
}
