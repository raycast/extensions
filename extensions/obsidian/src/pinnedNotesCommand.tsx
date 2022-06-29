import { List, showToast, Toast } from "@raycast/api";

import { useObsidianVaults } from "./utils/utils";
import { VaultSelection } from "./components/VaultSelection";
import { Vault } from "./utils/interfaces";
import { NoteListPinned } from "./components/NoteListPinned";
import { NoVaultFoundMessage } from "./components/NoVaultFoundMessage";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length > 1) {
    return <VaultSelection vaults={vaults} target={(vault: Vault) => <NoteListPinned vaultPath={vault.path} />} />;
  } else if (vaults.length == 1) {
    return <NoteListPinned vaultPath={vaults[0].path} />;
  } else {
    showToast({
      title: "Path Error",
      message: "Something went wrong with your vault path. There are no paths to select from.",
      style: Toast.Style.Failure,
    });
    return <List />;
  }
}
