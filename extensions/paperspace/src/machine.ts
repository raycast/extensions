import { Icon } from "@raycast/api";

export interface Machine {
  id: string;
  name: string;
  os: string;
  ram: string;
  cpus: number;
  gpu: string;
  storageTotal: string;
  storageUsed: string;
  machineType: string;
  usageRate: string;
  shutdownTimeoutInHours: number;
  shutdownTimeoutForces: boolean;
  performAutoSnapshot: boolean;
  autoSnapshotFrequency: string;
  autoSnapshotSaveCount: number;
  dynamicPublicIp: boolean;
  agentType: string;
  dtCreated: string;
  state:
    | "off"
    | "stopping"
    | "restarting"
    | "serviceready"
    | "ready"
    | "upgrading"
    | "provisioning";
  updatesPending: boolean;
  networkId: string;
  privateIpAddress: string;
  publicIpAddress: string;
  region: string;
  scriptId: null;
  dtLastRun: null;
  restorePointSnapshotId: null;
  restorePointFrequency: null;
  internalId: number;
}

export const isUsable = (machine: Machine) =>
  machine.state !== "upgrading" && machine.state !== "provisioning";

export const iconForMachineState: Record<Machine["state"], Icon> = {
  off: Icon.Stop,
  ready: Icon.Play,
  provisioning: Icon.Stop,
  restarting: Icon.Repeat,
  upgrading: Icon.Stop,
  stopping: Icon.Stop,
  serviceready: Icon.Play,
};
