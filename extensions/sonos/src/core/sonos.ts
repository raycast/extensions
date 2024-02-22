import { Toast, showToast } from "@raycast/api";
import { SonosDevice, SonosManager } from "@svrooij/sonos";
import { SonosState } from "@svrooij/sonos/lib/models/sonos-state";
import * as storage from "./storage";
import { isDefined } from "./utils";

export async function formatPlayingState(state: SonosState | null): Promise<string | null> {
  const playing = await isPlaying();
  const icon = playing ? `▶︎` : `⏸︎`;

  if (state === null) {
    return null;
  }

  // This means some kind of track is playing
  if (state.mediaInfo.CurrentURIMetaData === undefined) {
    const track = state.positionInfo.TrackMetaData;

    if (typeof track === "string") {
      return `${icon} ${track}`;
    }

    return `${icon} ${track.Title} - ${track.Artist}`;
  }

  // This means some kind of radio is playing
  const media = state.mediaInfo.CurrentURIMetaData;

  if (typeof media === "string") {
    return `${icon} ${media}`;
  }

  return `${icon} ${media.Title}`;
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

  if (storedState === null) {
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

  return storedState.sonosState;
}

export async function isPlaying() {
  const state = await getLatestState();
  return state?.transportState === "PLAYING";
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
  const manager = await getManager();
  const devices = manager.Devices;
  const availableGroups = await getAvailableGroups();
  const fallbackGroup = group === undefined && availableGroups.length === 1 ? availableGroups[0] : null;

  const member = devices.find((device) => device.GroupName === (fallbackGroup ?? group));
  const coordinator = member?.Coordinator;

  if (coordinator === undefined) {
    throw Error("No coordinator found");
  }

  return coordinator;
}
