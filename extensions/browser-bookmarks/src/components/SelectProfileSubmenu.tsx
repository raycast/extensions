import { Action, ActionPanel, Keyboard } from "@raycast/api";

import useAvailableBrowsers from "../hooks/useAvailableBrowsers";

type SelectProfileSubmenuProps = {
  bundleId: string;
  name: string;
  icon: string;
  shortcut: Keyboard.Shortcut;
  profiles: { path: string; name: string }[];
  currentProfile: string;
  setCurrentProfile: (path: string) => void;
};

export default function SelectProfileSubmenu({
  bundleId,
  name,
  icon,
  shortcut,
  profiles,
  currentProfile,
  setCurrentProfile,
}: SelectProfileSubmenuProps) {
  const { data: availableBrowsers } = useAvailableBrowsers();

  const hasBrowser = availableBrowsers?.map((browser) => browser.bundleId).includes(bundleId);
  if (!hasBrowser || profiles.length <= 1) {
    return null;
  }

  return (
    <ActionPanel.Submenu title={`Select ${name} Profile`} icon={icon} shortcut={shortcut}>
      {profiles.map((profile) => {
        return (
          <Action
            autoFocus={profile.path === currentProfile}
            key={profile.name}
            title={profile.name}
            onAction={() => setCurrentProfile(profile.path)}
          />
        );
      })}
    </ActionPanel.Submenu>
  );
}
