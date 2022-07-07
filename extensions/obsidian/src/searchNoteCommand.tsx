import { List } from "@raycast/api";

import { useObsidianVaults } from "./utils/utils";
import { NoteListObsidian } from "./components/NoteListObsidian";
import { VaultSelection } from "./components/VaultSelection";
import { Vault } from "./utils/interfaces";
import { NoVaultFoundMessage } from "./components/NoVaultFoundMessage";
import { pathErrorToast } from "./components/Toasts";

export default function Command() {
  const { ready, vaults } = useObsidianVaults();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length > 1) {
    return <VaultSelection vaults={vaults} target={(vault: Vault) => <NoteListObsidian vault={vault} />} />;
  } else if (vaults.length == 1) {
    return <NoteListObsidian vault={vaults[0]} />;
  } else {
    pathErrorToast();
  }
}
