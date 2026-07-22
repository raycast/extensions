import { Icon, MenuBarExtra, openCommandPreferences, showHUD } from "@raycast/api";
import { showFailureToast, useFrecencySorting } from "@raycast/utils";
import { useChromeProfiles } from "./hooks/use-chrome-profiles";
import { getProfileIcon } from "./lib/chrome-avatar";
import { launchProfile } from "./lib/chrome-launcher";
import { FRECENCY_NAMESPACE } from "./lib/frecency";
import type { ChromeProfile } from "./types";

export default function MenuBarProfiles() {
  const { profiles, isLoading, chromeInstalled } = useChromeProfiles();
  // Same namespace + key as the list command, so both share one usage ranking.
  const { data: sortedProfiles, visitItem } = useFrecencySorting(profiles, {
    namespace: FRECENCY_NAMESPACE,
    key: (profile) => profile.directory,
    sortUnvisited: () => 0,
  });

  return (
    <MenuBarExtra icon="extension-icon.png" isLoading={isLoading} tooltip="Chrome Profiles">
      {!isLoading && !chromeInstalled ? (
        <MenuBarExtra.Item icon={Icon.XMarkCircle} title="Google Chrome not found" />
      ) : (
        <MenuBarExtra.Section title="Open on this desktop">
          {sortedProfiles.map((profile) => (
            <MenuBarExtra.Item
              key={profile.directory}
              icon={getProfileIcon(profile)}
              title={profile.name}
              subtitle={profile.email ? `  ${profile.email}` : undefined}
              onAction={() => launch(profile, visitItem)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Gear} title="Configure Command" onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

async function launch(profile: ChromeProfile, onVisit: (profile: ChromeProfile) => Promise<void>) {
  try {
    await launchProfile(profile.directory);
    await onVisit(profile);
    await showHUD(`Opened ${profile.name}`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open Chrome" });
  }
}
