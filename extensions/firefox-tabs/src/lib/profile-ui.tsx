import { Action, Color, Icon, Image, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { ReactElement } from "react";
import { AMO_URL } from "./constants";
import { type ProfileStatus, firefoxExecutableFor, openInProfile, runningFirefoxPids } from "./profile-status";
import { type FirefoxProfile, type ProfileLabel, labelProfile } from "./profiles";

/**
 * One colour per Firefox profile, indexed by ProfileLabel.colorIndex (see
 * PROFILE_COLOR_COUNT). Green is left out because the Active tag uses it.
 */
export const PROFILE_COLORS: Color[] = [Color.Blue, Color.Orange, Color.Purple, Color.Magenta, Color.Yellow, Color.Red];

export function profileColor(label: ProfileLabel): Color {
  return PROFILE_COLORS[label.colorIndex % PROFILE_COLORS.length];
}

export function profileIcon(label: ProfileLabel): Image.ImageLike {
  if ("path" in label.icon) {
    return { source: label.icon.path, mask: Image.Mask.Circle };
  }
  return { source: Icon[label.icon.name as keyof typeof Icon] ?? Icon.PersonCircle, tintColor: profileColor(label) };
}

/** One-line description of what a profile needs. */
export function setupSubtitle(status: ProfileStatus): string {
  switch (status.state) {
    case "connected":
      return "Connected";
    case "needs-install":
      return "Companion extension not installed";
    case "disabled":
      return "Companion extension is disabled";
    case "not-connected":
      return "Extension installed but not connected. Try restarting this profile.";
    case "not-running":
      if (status.extension === "installed") return "Not running";
      if (status.extension === "unknown") return "Never opened";
      return "Not running, companion extension not installed";
  }
}

const STATE_TAGS: Record<ProfileStatus["state"], { value: string; color: Color }> = {
  connected: { value: "Connected", color: Color.Green },
  "needs-install": { value: "Needs Extension", color: Color.Orange },
  disabled: { value: "Disabled", color: Color.Orange },
  "not-connected": { value: "Not Connected", color: Color.Red },
  "not-running": { value: "Not Running", color: Color.SecondaryText },
};

/** Open Set Up Firefox Bridge, showing a toast if Raycast can't launch it. */
export async function openSetupCommand() {
  try {
    await launchCommand({ name: "setup-bridge", type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open Set Up Firefox Bridge" });
  }
}

async function openAndConfirm(status: ProfileStatus, url: string | undefined, what: string) {
  try {
    const executable = firefoxExecutableFor(status.firefoxPid, status.profile.path, runningFirefoxPids());
    await openInProfile(status.profile.path, url, executable);
    await showToast({ style: Toast.Style.Success, title: what, message: status.profile.name });
  } catch (error) {
    await showFailureToast(error, { title: `Couldn't open Firefox for ${status.profile.name}` });
  }
}

/** The main fix for a profile, as an Action, or null if it needs nothing. */
export function SetupAction({ status, inSetupCommand }: { status: ProfileStatus; inSetupCommand?: boolean }) {
  const name = status.profile.name;
  switch (status.state) {
    case "needs-install":
      return (
        <Action
          title={`Install Extension in ${name}`}
          icon={Icon.Download}
          onAction={() => openAndConfirm(status, AMO_URL, "Opened the add-on page")}
        />
      );
    case "disabled":
      return (
        <Action
          title={`Open Add-Ons in ${name}`}
          icon={Icon.Plug}
          onAction={() => openAndConfirm(status, "about:addons", "Opened Firefox add-ons")}
        />
      );
    case "not-connected":
      return inSetupCommand ? null : (
        <Action title="Set up Native Host" icon={Icon.Terminal} onAction={openSetupCommand} />
      );
    case "not-running":
      return (
        <Action
          title={`Launch ${name}`}
          icon={Icon.Globe}
          onAction={() => openAndConfirm(status, undefined, "Launching Firefox")}
        />
      );
    case "connected":
      return null;
  }
}

/** A list row for a profile's setup state. */
export function ProfileSetupItem({
  status,
  profiles,
  actions,
}: {
  status: ProfileStatus;
  profiles: FirefoxProfile[];
  actions: ReactElement;
}) {
  const label = labelProfile(status.profile.path, profiles);
  return (
    <List.Item
      key={status.profile.path}
      icon={label ? profileIcon(label) : Icon.PersonCircle}
      title={status.profile.name}
      subtitle={setupSubtitle(status)}
      keywords={["setup", "profile", "extension"]}
      accessories={[{ tag: STATE_TAGS[status.state], tooltip: status.profile.path }]}
      actions={actions}
    />
  );
}
