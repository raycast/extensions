import {
  getPreferenceValues,
  MenuBarExtra,
  Icon,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import LegacyMenu from "./legacy-menu";
import AttentionMenu from "./attention/menu-bar";
import { checkGhStatus, isBlocked } from "./attention/lib/gh-status";

function ClassicMenu() {
  const { data, isLoading, error, revalidate } = useCachedPromise(checkGhStatus, [], { keepPreviousData: false });
  if (isLoading || !data || error || isBlocked(data))
    return (
      <MenuBarExtra icon="icon.png" isLoading={isLoading} tooltip="GitHub Review Requests">
        <MenuBarExtra.Item
          title={isLoading ? "Checking GitHub access…" : "Check GitHub authentication"}
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
        <MenuBarExtra.Item
          title="Open Setup Instructions"
          onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Check Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
      </MenuBarExtra>
    );
  return <LegacyMenu />;
}

export default function Command() {
  const { menuBarLayout } = getPreferenceValues<Preferences.ActionablePullRequests>();
  return menuBarLayout === "attention" ? <AttentionMenu /> : <ClassicMenu />;
}
