import { List } from "@raycast/api";

import { VaultSelection } from "./components/VaultSelection";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { noVaultPathsToast } from "./components/Toasts";
import { RandomNote } from "./components/RandomNote";
import { useObsidianVaults } from "./utils/hooks";
import { ObsidianVault } from "@/obsidian";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length > 1) {
    return (
      <VaultSelection
        vaults={vaults}
        target={(vault: ObsidianVault) => <RandomNote vault={vault} showTitle={true} />}
      />
    );
  } else if (vaults.length === 1) {
    return <RandomNote vault={vaults[0]} showTitle={false} />;
  } else {
    noVaultPathsToast();
    return <List />;
  }
}
