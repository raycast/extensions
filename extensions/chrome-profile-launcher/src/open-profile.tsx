import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List, showHUD } from "@raycast/api";
import { createDeeplink, showFailureToast, useFrecencySorting } from "@raycast/utils";
import { useChromeProfiles } from "./hooks/use-chrome-profiles";
import { getProfileIcon } from "./lib/chrome-avatar";
import { buildLaunchCommand, launchIncognito, launchProfile, revealProfileFolder } from "./lib/chrome-launcher";
import { FRECENCY_NAMESPACE } from "./lib/frecency";
import type { ChromeProfile } from "./types";

type VisitFn = (profile: ChromeProfile) => Promise<void>;

export default function Command() {
  const { profiles, isLoading, chromeInstalled, refresh } = useChromeProfiles();
  // Learn which profiles you actually reach for: most-used / most-recent float to
  // the top and persist. Unvisited profiles keep Chrome's own order (sortUnvisited).
  const { data: sortedProfiles, visitItem } = useFrecencySorting(profiles, {
    namespace: FRECENCY_NAMESPACE,
    key: (profile) => profile.directory,
    sortUnvisited: () => 0,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Chrome profiles…">
      {sortedProfiles.map((profile) => (
        <ProfileItem key={profile.directory} profile={profile} onVisit={visitItem} onRefresh={refresh} />
      ))}
      {!isLoading && !chromeInstalled && (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Google Chrome not found"
          description="Install Google Chrome, then reopen this command."
        />
      )}
      {!isLoading && chromeInstalled && sortedProfiles.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Chrome profiles found"
          description="No profiles were found in your Chrome data folder."
        />
      )}
    </List>
  );
}

function ProfileItem({
  profile,
  onVisit,
  onRefresh,
}: {
  profile: ChromeProfile;
  onVisit: VisitFn;
  onRefresh: () => void;
}) {
  const accessories: List.Item.Accessory[] = [
    { tag: { value: profile.directory, color: profile.color }, tooltip: `Profile directory: ${profile.directory}` },
  ];
  if (profile.isDefault) {
    accessories.unshift({ icon: { source: Icon.Star, tintColor: profile.color }, tooltip: "Default profile" });
  }

  return (
    <List.Item
      icon={getProfileIcon(profile)}
      title={profile.name}
      subtitle={profile.email}
      keywords={[profile.directory, profile.email].filter((keyword): keyword is string => Boolean(keyword))}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Open New Chrome Window"
              icon={Icon.AppWindow}
              onAction={() => launch(profile, "normal", onVisit)}
            />
            <Action
              title="Open Incognito Window"
              icon={Icon.Mask}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={() => launch(profile, "incognito", onVisit)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Reveal Profile Folder"
              icon={Icon.Finder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={() => reveal(profile)}
            />
            <Action.CopyToClipboard title="Copy Launch Command" content={buildLaunchCommand(profile.directory)} />
            <Action.CreateQuicklink
              title="Create Quicklink for Hotkey"
              icon={Icon.Link}
              quicklink={{
                name: `Launch ${profile.name}`,
                link: createDeeplink({ command: "launch-profile", arguments: { profile: profile.directory } }),
              }}
            />
            <Action
              title="Refresh Profiles"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function launch(profile: ChromeProfile, mode: "normal" | "incognito", onVisit: VisitFn) {
  // Close Raycast BEFORE launching Chrome so it fully yields focus first. This
  // removes an overlap between Raycast closing and Chrome's async new-window
  // creation that can otherwise land the window on the wrong Space or drop it.
  await closeMainWindow();
  try {
    if (mode === "incognito") {
      await launchIncognito(profile.directory);
    } else {
      await launchProfile(profile.directory);
    }
    await onVisit(profile);
    await showHUD(mode === "incognito" ? `Opened ${profile.name} (Incognito)` : `Opened ${profile.name}`);
  } catch (error) {
    // The main window is already closed, so a Toast wouldn't be visible — use a HUD.
    console.error("Failed to launch Chrome profile", error);
    await showHUD(`⚠️ Couldn't open ${profile.name} — is Google Chrome installed?`);
  }
}

async function reveal(profile: ChromeProfile) {
  try {
    await revealProfileFolder(profile.directory);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't reveal profile folder" });
  }
}
