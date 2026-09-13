import {
  Color,
  Icon,
  MenuBarExtra,
  launchCommand,
  LaunchType,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { isValidVault } from "./vault";
import { openApp } from "./app-link";

// A no-view command launched this way runs quietly in the background, same as pressing it from
// Raycast's own root search would; a view command instead opens Raycast straight to that view.
// Either way this is the SAME command the menu bar item names, so there is exactly one
// implementation of "search notes" or "create a note" — this just gives it a second entry point.
async function launch(name: string, title: string) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: `Couldn't launch ${title}` });
  }
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.MenuBar>();
  const valid = isValidVault(preferences.vaultPath);

  return (
    // Tinted with the adaptive foreground color rather than left as the PNG's own solid black —
    // every native status item next to it (wifi, bluetooth, battery) is a macOS "template image"
    // that swaps between white and black to match the current menu bar appearance, and an untinted
    // PNG has no such behavior: it just renders in whatever color its pixels actually are, which
    // read as a flat black smudge against a dark menu bar instead of matching its neighbors.
    <MenuBarExtra icon={{ source: "menubar-icon.png", tintColor: Color.PrimaryText }} tooltip="MarkdownOS">
      {!valid ? (
        <MenuBarExtra.Item title="No vault configured" icon={Icon.Warning} onAction={openExtensionPreferences} />
      ) : (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Create Note" onAction={() => launch("new-note", "Create Note")} />
            <MenuBarExtra.Item title="Search Notes" onAction={() => launch("search-notes", "Search Notes")} />
            <MenuBarExtra.Item
              title="Search Bookmarks"
              onAction={() => launch("search-bookmarks", "Search Bookmarks")}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Open App" onAction={() => openApp(preferences.vaultPath)} />
            <MenuBarExtra.Item title="Open Bookmarks" onAction={() => launch("open-bookmarks", "Open Bookmarks")} />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Settings" onAction={openExtensionPreferences} />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
