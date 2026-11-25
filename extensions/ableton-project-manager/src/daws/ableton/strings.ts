import type { Language } from "@/settings";

// Sets 视图专用的文字：Ableton 的 Set 是独立的 .als 文件，可以改名、复制、删除。
type SetsViewStrings = {
  searchSets: string;
  openInDaw: string;
  copySetName: string;
  copySetPath: string;
  duplicateSet: string;
  setDuplicated: string;
  renameSet: string;
  setRenamed: string;
  setNameExists: string;
  renameSetConfirmTitle: string;
  renameSetConfirmMessage: string;
  trashSetHint: string;
};

const strings: Record<Language, SetsViewStrings> = {
  en: {
    searchSets: "Search Sets",
    openInDaw: "Open in Ableton Live",
    copySetName: "Copy Set Name",
    copySetPath: "Copy Set Path",
    duplicateSet: "Duplicate Set",
    setDuplicated: "Set Duplicated",
    renameSet: "Rename Set",
    setRenamed: "Set Renamed",
    setNameExists: "A Set with that name already exists",
    renameSetConfirmTitle: "Rename Set?",
    renameSetConfirmMessage:
      "Make sure this Set is closed in Ableton Live. Renaming while it's open can make Ableton keep saving to the old name.",
    trashSetHint: "This moves the Set to the Trash:",
  },
};

export function getSetsViewStrings(language: Language): SetsViewStrings {
  return strings[language];
}
