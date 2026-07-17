import { getPreferenceValues } from "@raycast/api";
import { ShortcutLibraryGridLayout } from "./components/shortcut-library-grid-layout";
import { ShortcutLibraryListLayout } from "./components/shortcut-library-list-layout";
import { Preferences } from "./types/preferences";

export default function ShortcutLibrary() {
  const preferences = getPreferenceValues<Preferences>();

  return preferences.layout === "List" ? (
    <ShortcutLibraryListLayout preferences={preferences} />
  ) : (
    <ShortcutLibraryGridLayout preferences={preferences} />
  );
}
