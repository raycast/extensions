import { Toast, showToast } from "@raycast/api";
import { SonosDevice, SonosManager } from "@svrooij/sonos";
import { SonosState } from "@svrooij/sonos/lib/models/sonos-state";
import * as storage from "./storage";
import { isDefined } from "./utils";

// Raycast commands can run in separate processes, so disable the SDK's service
// event subscriptions before SonosManager adds listeners in @svrooij/sonos.
// Otherwise every command process tries to bind the shared event listener port
// (6329) and fails with EADDRINUSE when commands run in quick succession.
process.env.SONOS_DISABLE_EVENTS = "true";
// Belt and braces: if a subscription ever sneaks through anyway, make sure the
// listener server never binds its port.
process.env.SONOS_DISABLE_LISTENER = "true";

export function formatPlayingState(state: SonosState | null): string | null {
  if (state === null) {
    return null;
  }

  const icon = state.transportState === "PLAYING" ? `▶︎` : `⏸︎`;

  const media = state.mediaInfo.CurrentURIMetaData;
  const track = state.positionInfo.TrackMetaData;

  // Spotify Connect (and other virtual line-in sources) report generic line-in
  // meta data, where `Title` is the source app name. The actual track is in
  // the position info's track meta data.
  const isVirtualLineIn = typeof media === "object" && media.UpnpClass?.includes("linein") === true;

  if (media === undefined || (isVirtualLineIn && typeof track === "object" && track.Title)) {
    if (typeof track === "string") {
      return `${icon} ${track}`;
    }

    if (typeof track === "object" && track.Title) {
      return track.Artist ? `${icon} ${track.Title} - ${track.Artist}` : `${icon} ${track.Title}`;
    }
  }

  // This means some kind of radio is playing
  if (media !== undefined) {
    if (typeof media === "string") {
      return `${icon} ${media}`;
    }

    return `${icon} ${media.Title}`;
  }

  return null;
}

let manager: SonosManager | null = null;

export async function getManager() {
  if (manager === null) {
    manager = new SonosManager();
    await manager.InitializeWithDiscovery(3);
  }

  return manager;
}

export async function getLatestState(): Promise<SonosState | null> {
  const storedState = await storage.getState();

  if (storedState !== null) {
    return storedState.sonosState;
  }

  const coordinator = await getActiveCoordinator();

  if (coordinator === undefined) {
    await showToast({
      title: "No explicit group set",
      style: Toast.Style.Failure,
    });

    return null;
  }

  const state = await storage.setState(coordinator);

  return state.sonosState;
}

export async function getAvailableGroups(): Promise<string[]> {
  const manager = await getManager();
  const groups = manager.Devices.map((device) => device.GroupName).filter(isDefined);
  const uniqueGroups = new Set<string>(groups);

  return Array.from(uniqueGroups);
}

export async function getActiveCoordinator(): Promise<SonosDevice | undefined> {
  const group = await storage.getActiveGroup();
  const coordinator = await getGroupCoordinator(group);

  return coordinator;
}

export async function getGroupCoordinator(group: string | undefined): Promise<SonosDevice | undefined> {
  let coordinator = await getCoordinatorByGroup(group);

  if (coordinator === undefined) {
    await storage.setActiveGroup(undefined);
    coordinator = await getCoordinatorByGroup(await getDefaultGroup());
  }

  if (coordinator === undefined) {
    throw Error("No coordinator found");
  }

  return coordinator;
}

async function getDefaultGroup() {
  const groups = await getAvailableGroups();
  return groups.length > 1 ? undefined : groups[0];
}

async function getCoordinatorByGroup(group: string | undefined): Promise<SonosDevice | undefined> {
  if (!group) return undefined;

  const manager = await getManager();
  const member = manager.Devices.find((device) => device.GroupName === group);
  const coordinator = member?.Coordinator;

  return coordinator;
}
