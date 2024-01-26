import { useEffect, useState } from "react";
import { SonosDevice, SonosManager } from "@svrooij/sonos";
import { getActiveGroup } from "./storage";
import { SonosState } from "@svrooij/sonos/lib/models/sonos-state";

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function formatPlayingState({ playing, state }: { playing: boolean; state: SonosState }): string {
  const icon = playing ? `▶︎` : `⏸︎`;

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

export async function getManager() {
  const manager = new SonosManager();
  await manager.InitializeWithDiscovery(3);

  return manager;
}

export async function getActiveCoordinator(): Promise<SonosDevice | undefined> {
  try {
    const group = await getActiveGroup();
    const coordinator = await getCoordinatorDevice(group);

    return coordinator;
  } catch (error) {
    return undefined;
  }
}

export async function getAvailableGroups(): Promise<string[]> {
  const manager = await getManager();
  const groups = manager.Devices.map((device) => device.GroupName).filter(isDefined);
  const uniqueGroups = new Set<string>(groups);

  return Array.from(uniqueGroups);
}

export async function isPlaying(device: SonosDevice) {
  const state = await device.GetState();
  return state.transportState === "PLAYING";
}

export async function getCoordinatorDevice(group: string | undefined): Promise<SonosDevice | undefined> {
  const manager = await getManager();
  const devices = manager.Devices;
  const availableGroups = await getAvailableGroups();
  const fallbackGroup = group === "" && availableGroups.length === 1 ? availableGroups[0] : null;

  const member = devices.find((device) => device.GroupName === (fallbackGroup ?? group));
  const coordinator = member?.Coordinator;

  if (coordinator === undefined) {
    throw Error("No coordinator found");
  }

  return coordinator;
}

export function useSonos() {
  const [activeGroup, setActiveGroup] = useState<string>();
  const [availableGroups, setAvailableGroups] = useState<string[]>();

  useEffect(() => {
    async function run() {
      const groups = await getAvailableGroups();
      setAvailableGroups(groups);

      const activeGroup = await getActiveGroup();
      setActiveGroup(activeGroup);
    }

    run();
  }, []);

  return {
    availableGroups: availableGroups,
    activeGroup,
  };
}
