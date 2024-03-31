import { closeMainWindow, getPreferenceValues, getSelectedText, List, open, popToRoot } from "@raycast/api";

import { CreateNoteForm } from "./components/CreateNoteForm";
import { VaultSelection } from "./components/VaultSelection";
import { Vault } from "./utils/interfaces";
import { getObsidianTarget, ObsidianTargetType, useObsidianVaults } from "./utils/utils";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { noVaultPathsToast } from "./components/Toasts";
import { NoteFormPreferences } from "./utils/preferences";
import { useEffect, useState } from "react";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();
  const [text, setText] = useState("");

  useEffect(() => {
    async function getContent() {
      try {
        const selectedText = await getSelectedText();
        setText(selectedText);
      } catch (error) {
        closeMainWindow();
        console.error("Error in getting content", error);
      }
    }
    getContent();
  }, []);

  if (!ready || !text) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  } else if (vaults.length > 1) {
    return (
      <VaultSelection vaults={vaults} target={(vault: Vault) => <CreateNoteForm vault={vault} showTitle={true} />} />
    );
  } else if (vaults.length == 1) {
    const target = getObsidianTarget({
      type: ObsidianTargetType.NewNote,
      vault: vaults[0],
      name: text,
      content: "",
    });
    open(target);
    popToRoot();
  } else {
    noVaultPathsToast();
  }
}
