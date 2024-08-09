import { MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { FC } from "react";
import { MENU } from "../../constants";
import { MenuBarPreferences, WordEntryProps } from "../../types";
import { openPronunciation } from "../../utils";

export const ItemPronunciation: FC<WordEntryProps> = ({ wordEntry }) => {
  const preferences = getPreferenceValues<ExtensionPreferences & MenuBarPreferences>();

  const showPronunciation = async () => {
    await openPronunciation(wordEntry);
  };

  if (!preferences.showPronunciation) return;
  return <MenuBarExtra.Item {...MENU.pronunciation} onAction={showPronunciation} />;
};

export default ItemPronunciation;
