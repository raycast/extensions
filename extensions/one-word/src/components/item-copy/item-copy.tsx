import { MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { FC } from "react";
import { MENU } from "../../constants";
import { MenuBarPreferences, WordEntryProps } from "../../types";
import { copy } from "../../utils";

export const ItemCopy: FC<WordEntryProps> = ({ wordEntry }) => {
  const preferences = getPreferenceValues<ExtensionPreferences & MenuBarPreferences>();

  const onCopy = async () => {
    await copy(wordEntry);
  };

  if (!preferences.showCopy) return;
  return <MenuBarExtra.Item {...MENU.copy} onAction={onCopy} />;
};

export default ItemCopy;
