import { List } from "@raycast/api";

import { useObsidianVaults } from "./utils/utils";
import { VaultSelection } from "./components/VaultSelection";
import { Vault } from "./utils/interfaces";
import { NoteListPinned } from "./components/NoteListPinned";
import { NoVaultFoundMessage } from "./components/NoVaultFoundMessage";
import { pathErrorToast } from "./components/Toasts";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length > 1) {
    return <VaultSelection vaults={vaults} target={(vault: Vault) => <NoteListPinned vault={vault} />} />;
  } else if (vaults.length == 1) {
    return <NoteListPinned vault={vaults[0]} />;
  } else {
    pathErrorToast();
    return <List />;
  }
}
