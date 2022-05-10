import { showToast, Toast } from "@raycast/api";

import { parseVaults } from "./utils/utils";
import { VaultSelection } from "./components/VaultSelection";
import { Vault } from "./utils/interfaces";
import { NoteListPinned } from "./components/NoteListPinned";

export default function Command() {
  const vaults = parseVaults();
  if (vaults.length > 1) {
    return <VaultSelection vaults={vaults} target={(vault: Vault) => <NoteListPinned vaultPath={vault.path} />} />;
  } else if (vaults.length == 1) {
    return <NoteListPinned vaultPath={vaults[0].path} />;
  } else {
    showToast({
      title: "Path Error",
      message: "Something went wrong with your vault path. There are no paths to select from.",
      style: Toast.Style.Failure,
    });
  }
}
