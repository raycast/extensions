import { List } from "@raycast/api";

import { CreateNoteForm } from "./components/CreateNoteForm";
import { VaultSelection } from "./components/VaultSelection";
import { Vault } from "./utils/interfaces";
import { useObsidianVaults } from "./utils/utils";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { noVaultPathsToast } from "./components/Toasts";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length > 1) {
    return (
      <VaultSelection vaults={vaults} target={(vault: Vault) => <CreateNoteForm vault={vault} showTitle={true} />} />
    );
  } else if (vaults.length == 1) {
    return <CreateNoteForm vault={vaults[0]} showTitle={false} />;
  } else {
    noVaultPathsToast();
  }
}
