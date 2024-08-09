import { MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { FC } from "react";
import { MENU } from "../../constants";
import { useWordEntry } from "../../hooks/use-word-entry";
import { MenuBarPreferences } from "../../types";

const ItemUpdate: FC<{ setLocalWordEntry: (we: WordEntry) => void }> = ({ setLocalWordEntry }) => {
  const { updateWord } = useWordEntry(setLocalWordEntry);
  const preferences = getPreferenceValues<ExtensionPreferences & MenuBarPreferences>();

  if (!preferences.showGetNewWord) return;

  return <MenuBarExtra.Item {...MENU.changeWord} onAction={updateWord} />;
};

export default ItemUpdate;
