import { List, showToast, Toast } from "@raycast/api";

import { useObsidianVaults } from "./utils/utils";
import { NoteListObsidian } from "./components/NoteListObsidian";
import { VaultSelection } from "./components/VaultSelection";
import { Vault } from "./utils/interfaces";
import { NoVaultFoundMessage } from "./components/NoVaultFoundMessage";

export default function Command() {
  const { ready, vaults } = useObsidianVaults();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length > 1) {
    return <VaultSelection vaults={vaults} target={(vault: Vault) => <NoteListObsidian vaultPath={vault.path} />} />;
  } else if (vaults.length == 1) {
    return <NoteListObsidian vaultPath={vaults[0].path} />;
  } else {
    showToast({
      title: "Path Error",
      message: "Something went wrong with your vault path. There are no paths to select from.",
      style: Toast.Style.Failure,
    });
  }
}
