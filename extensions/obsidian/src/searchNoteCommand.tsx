import { List } from "@raycast/api";

import { NoteListObsidian } from "./components/NoteList/NoteListObsidian";
import { VaultSelection } from "./components/VaultSelection";
import { SearchArguments } from "./utils/interfaces";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { noVaultPathsToast } from "./components/Toasts";
import { useObsidianVaults } from "./utils/hooks";
import { Vault } from "./api/vault/vault.types";

export default function Command(props: { arguments: SearchArguments }) {
  const { ready, vaults } = useObsidianVaults();

  if (!ready) {
    return <List isLoading={true} />;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length > 1) {
    return (
      <VaultSelection
        vaults={vaults}
        target={(vault: Vault) => (
          <NoteListObsidian vault={vault} showTitle={true} bookmarked={false} searchArguments={props.arguments} />
        )}
      />
    );
  } else if (vaults.length == 1) {
    return (
      <NoteListObsidian vault={vaults[0]} showTitle={false} bookmarked={false} searchArguments={props.arguments} />
    );
  } else {
    noVaultPathsToast();
  }
}
