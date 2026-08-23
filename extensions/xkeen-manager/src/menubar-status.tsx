import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { loadStartupData } from "./lib/health";
import { loadProfilesData, applyProfile } from "./lib/profiles";
import { parseXkeenStatus } from "./lib/xkeenStatus";
import { runRemote } from "./lib/ssh";
import { parseErrorMessage } from "./lib/utils";

// Background-refreshable command (see package.json `interval`): it may be
// launched with no user present, so it must never throw and must never show
// a toast/HUD outside of explicit, user-initiated onAction handlers.

export default function MenuBarStatus() {
  const {
    data: startupData,
    isLoading: isStartupLoading,
    error: startupError,
    revalidate: revalidateStartup,
  } = useCachedPromise(loadStartupData, [], {
    keepPreviousData: true,
    onError: () => {},
  });

  const {
    data: profilesData,
    isLoading: isProfilesLoading,
    revalidate: revalidateProfiles,
  } = useCachedPromise(loadProfilesData, [], {
    keepPreviousData: true,
    onError: () => {},
  });

  const hasError = Boolean(startupError) || !startupData;
  const statusRaw = startupData?.statusRaw ?? "";
  const activeProfile = profilesData?.active ?? startupData?.activeProfile ?? "unknown";
  const { isRunning, mode } = parseXkeenStatus(statusRaw);

  const state: "error" | "running" | "stopped" = hasError ? "error" : isRunning ? "running" : "stopped";

  const tintColor = state === "running" ? Color.Green : state === "stopped" ? Color.Red : Color.Orange;
  const tooltip =
    state === "running"
      ? `XKeen: Running (${mode}) · ${activeProfile}`
      : state === "stopped"
        ? "XKeen: Stopped"
        : "XKeen: connection error";
  const statusTitle =
    state === "running" ? `Running (${mode}) · ${activeProfile}` : state === "stopped" ? "Stopped" : "Connection error";

  const profileNames = profilesData?.names ?? [];

  async function openManager() {
    try {
      await launchCommand({ name: "xkeen-manager", type: LaunchType.UserInitiated });
    } catch {
      // best-effort; nothing else to surface here
    }
  }

  function refresh() {
    revalidateStartup();
    revalidateProfiles();
  }

  async function switchProfile(name: string) {
    try {
      await applyProfile(name);
      refresh();
      await showHUD(`Switched to ${name}`);
    } catch (e) {
      await showHUD(`Failed: ${parseErrorMessage(e)}`);
    }
  }

  async function restart() {
    try {
      await runRemote("xkeen -restart");
      refresh();
      await showHUD("Xkeen restarted");
    } catch (e) {
      await showHUD(`Failed: ${parseErrorMessage(e)}`);
    }
  }

  return (
    <MenuBarExtra
      icon={{ source: Icon.Shield, tintColor }}
      tooltip={tooltip}
      isLoading={isStartupLoading || isProfilesLoading}
    >
      <MenuBarExtra.Item title={statusTitle} onAction={openManager} />
      <MenuBarExtra.Section title="Profiles">
        {profileNames.length > 0 ? (
          <MenuBarExtra.Submenu title="Switch Profile" icon={Icon.Switch}>
            {profileNames.map((name) => {
              const isActive = name === activeProfile;
              return (
                <MenuBarExtra.Item
                  key={name}
                  title={name}
                  icon={isActive ? Icon.Checkmark : Icon.Circle}
                  onAction={isActive ? refresh : () => switchProfile(name)}
                />
              );
            })}
          </MenuBarExtra.Submenu>
        ) : (
          <MenuBarExtra.Item title="Profiles unavailable" />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item title="Restart Xkeen" icon={Icon.RotateClockwise} onAction={restart} />
        <MenuBarExtra.Item title="Refresh" icon={Icon.RotateClockwise} onAction={refresh} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
