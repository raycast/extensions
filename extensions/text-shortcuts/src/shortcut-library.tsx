import { getPreferenceValues } from "@raycast/api";
import React from "react";
import { Preferences } from "./types/preferences";
import { ShortcutLibraryListLayout } from "./components/shortcut-library-list-layout";
import { ShortcutLibraryGridLayout } from "./components/shortcut-library-grid-layout";

export default function ShortcutLibrary() {
  const preferences = getPreferenceValues<Preferences>();

  return preferences.layout === "List" ? (
    <ShortcutLibraryListLayout preferences={preferences} />
  ) : (
    <ShortcutLibraryGridLayout preferences={preferences} />
  );
}
