import { useEffect, useState } from "react";
import { SonosDevice, SonosManager } from "@svrooij/sonos";
import { getActiveGroup } from "./storage";

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

export async function isPlaying(device: SonosDevice) {
  const state = await device.GetState();
  return state.transportState === "PLAYING";
}

export async function getCoordinatorDevice(group: string | undefined): Promise<SonosDevice | undefined> {
  const { manager } = await getSonos();
  const devices = manager.Devices;

  const member = devices.find((device) => device.GroupName === group);
  const coordinator = member?.Coordinator;

  if (coordinator === undefined) {
    throw Error("No coordinator found");
  }

  return coordinator;
}

export function useSonos() {
  const [activeGroup, setActiveGroup] = useState<string>();
  const [availableGroups, setAvailableGroups] = useState<Set<string>>();

  useEffect(() => {
    async function run() {
      const activeGroup = await getActiveGroup();
      setActiveGroup(activeGroup);
    }

    run();
  }, []);

  useEffect(() => {
    async function run() {
      const { manager } = await getSonos();
      const groups = new Set<string>();

      manager.Devices.forEach((device) => groups.add(device.groupName));

      console.log({
        groups,
      });

      setAvailableGroups(groups);
    }

    run();
  }, []);

  return {
    availableGroups: availableGroups,
    activeGroup,
  };
}
