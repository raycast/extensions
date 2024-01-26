import { useEffect, useState } from "react";
import { SonosDevice, SonosManager } from "@svrooij/sonos";
import { getActiveGroup } from "./storage";

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export async function getSonos() {
  const manager = new SonosManager();
  await manager.InitializeWithDiscovery(10);

  return {
    manager,
  };
}

export async function getActiveCoordinator(): Promise<SonosDevice | undefined> {
  const group = await getActiveGroup();
  const coordinator = await getCoordinatorDevice(group);

  return coordinator;
}

export async function getAvailableGroups(): Promise<string[]> {
  const { manager } = await getSonos();
  const devices = manager.Devices;
  const groups = devices.map((device) => device.GroupName).filter(isDefined);
  const uniqueGroups = new Set<string>(groups);

  return Array.from(uniqueGroups);
}

export async function isPlaying(device: SonosDevice) {
  const state = await device.GetState();
  return state.transportState === "PLAYING";
}

export async function getCoordinatorDevice(group: string | undefined): Promise<SonosDevice | undefined> {
  const { manager } = await getSonos();
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
