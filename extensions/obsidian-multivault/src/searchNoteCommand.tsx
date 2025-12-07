import { getPreferenceValues, List } from "@raycast/api";

import { NoteListObsidian } from "./components/NoteList/NoteListObsidian";
import { SmartVaultSelection } from "./components/SmartVaultSelection";
import { SearchArguments } from "./utils/interfaces";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { noVaultPathsToast } from "./components/Toasts";
import { useObsidianVaults } from "./utils/hooks";
import { Vault } from "./api/vault/vault.types";
import { GlobalPreferences } from "./utils/preferences";

export default function Command(props: { arguments: SearchArguments }) {
  const { ready, vaults } = useObsidianVaults();
  const preferences = getPreferenceValues<GlobalPreferences>();

  if (!ready) {
    return <List isLoading={true} />;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length >= 1) {
    return (
      <SmartVaultSelection
        vaults={vaults}
        preferences={preferences}
        target={(vault: Vault, onSwitchVault: () => void) => (
          <NoteListObsidian
            vault={vault}
            showTitle={vaults.length > 1}
            bookmarked={false}
            searchArguments={props.arguments}
            onSwitchVault={vaults.length > 1 ? onSwitchVault : undefined}
          />
        )}
      />
    );
  } else {
    noVaultPathsToast();
  }
}
