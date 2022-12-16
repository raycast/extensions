import { List } from "@raycast/api";

import { useObsidianVaults } from "./utils/utils";
import { VaultSelection } from "./components/VaultSelection";
import { SearchArguments, Vault } from "./utils/interfaces";
import { NoteListPinned } from "./components/NoteList/NoteListPinned";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { noVaultPathsToast } from "./components/Toasts";

export default function Command(props: { arguments: SearchArguments }) {
  const { vaults, ready } = useObsidianVaults();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length > 1) {
    return (
      <VaultSelection
        vaults={vaults}
        target={(vault: Vault) => <NoteListPinned vault={vault} showTitle={true} searchArguments={props.arguments} />}
      />
    );
  } else if (vaults.length == 1) {
    return <NoteListPinned vault={vaults[0]} showTitle={false} searchArguments={props.arguments} />;
  } else {
    noVaultPathsToast();
    return <List />;
  }
}
