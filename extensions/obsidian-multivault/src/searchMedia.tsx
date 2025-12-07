import { getPreferenceValues, List } from "@raycast/api";

import { SmartVaultSelection } from "./components/SmartVaultSelection";
import { MediaSearchArguments } from "./utils/interfaces";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { noVaultPathsToast } from "./components/Toasts";
import { MediaGrid } from "./components/MediaGrid";
import { useObsidianVaults } from "./utils/hooks";
import { Vault } from "./api/vault/vault.types";
import { GlobalPreferences } from "./utils/preferences";

export default function Command(props: { arguments: MediaSearchArguments }) {
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
          <MediaGrid vault={vault} searchArguments={props.arguments} />
        )}
      />
    );
  } else {
    noVaultPathsToast();
    return <List />;
  }
}
