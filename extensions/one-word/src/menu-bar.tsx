import { Icon, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { ItemCopy, ItemFavorite, ItemPronunciation, ItemUpdate } from "./components";
import { STR } from "./constants";
import { useWordEntry } from "./hooks/use-word-entry";
import { MenuBarPreferences } from "./types";
import { print } from "./utils";

export default function MenuBar() {
  const { isLoading, wordEntry } = useWordEntry();
  const [localWordEntry, setLocalWordEntry] = useState<WordEntry>();

  const isPending = isLoading || !wordEntry;

  useEffect(() => {
    if (!wordEntry) return;
    setLocalWordEntry(wordEntry);
  }, [wordEntry]);

  const preferences = getPreferenceValues<ExtensionPreferences & MenuBarPreferences>();

  const icon =
    preferences.menuBarIcon && preferences.menuBarIcon in Icon
      ? Icon[preferences.menuBarIcon as keyof typeof Icon]
      : undefined;

  return (
    <MenuBarExtra icon={icon} title={print(localWordEntry || wordEntry)} isLoading={isPending} tooltip={STR.TOOLTIP}>
      {isPending ? null : (
        <>
          <ItemUpdate setLocalWordEntry={setLocalWordEntry} />
          <ItemPronunciation wordEntry={wordEntry} />
          <ItemFavorite wordEntry={wordEntry} />
          <ItemCopy wordEntry={wordEntry} />
        </>
      )}
    </MenuBarExtra>
  );
}
