import { getPreferenceValues, List } from "@raycast/api";

import { SmartVaultSelection } from "./components/SmartVaultSelection";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { noVaultPathsToast } from "./components/Toasts";
import { RandomNote } from "./components/RandomNote";
import { useObsidianVaults } from "./utils/hooks";
import { Vault } from "./api/vault/vault.types";
import { GlobalPreferences } from "./utils/preferences";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();
  const preferences = getPreferenceValues<GlobalPreferences>();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length >= 1) {
    return (
      <SmartVaultSelection
        vaults={vaults}
        preferences={preferences}
        target={(vault: Vault) => (
          <RandomNote vault={vault} showTitle={vaults.length > 1} />
        )}
      />
    );
  } else {
    noVaultPathsToast();
    return <List />;
  }
}
