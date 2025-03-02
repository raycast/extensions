/**
 * Mutable state types for use with Immer
 * @module
 */

import type { HarmonyHub, HarmonyDevice, HarmonyActivity, HarmonyCommand, LoadingState } from "./harmony";

/**
 * Mutable version of HarmonyHub
 */
export interface MutableHarmonyHub {
  id: string;
  name: string;
  ip: string;
  remoteId: string;
  hubId: string;
  version: string;
  port: string;
  productId: string;
  protocolVersion: string;
}

/**
 * Mutable version of HarmonyCommand
 */
export interface MutableHarmonyCommand {
  id: string;
  name: string;
  label: string;
  deviceId: string;
  group?: string;
}

/**
 * Mutable version of HarmonyDevice
 */
export interface MutableHarmonyDevice {
  id: string;
  name: string;
  type: string;
  commands: MutableHarmonyCommand[];
}

/**
 * Mutable version of HarmonyActivity
 */
export interface MutableHarmonyActivity {
  id: string;
  name: string;
  type: string;
  isCurrent: boolean;
}

/**
 * Mutable version of LoadingState
 */
export interface MutableLoadingState {
  stage: string;
  progress: number;
  message: string;
}

/**
 * Mutable version of HarmonyState
 */
export interface MutableHarmonyState {
  hubs: MutableHarmonyHub[];
  selectedHub: MutableHarmonyHub | null;
  devices: MutableHarmonyDevice[];
  activities: MutableHarmonyActivity[];
  currentActivity: MutableHarmonyActivity | null;
  error: Error | null;
  loadingState: MutableLoadingState;
}

/**
 * Convert a readonly HarmonyHub to a mutable one
 */
export function toMutableHub(hub: HarmonyHub): MutableHarmonyHub {
  return {
    id: hub.id,
    name: hub.name,
    ip: hub.ip,
    remoteId: hub.remoteId,
    hubId: hub.hubId,
    version: hub.version,
    port: hub.port,
    productId: hub.productId,
    protocolVersion: hub.protocolVersion,
  };
}

/**
 * Convert a readonly HarmonyCommand to a mutable one
 */
export function toMutableCommand(command: HarmonyCommand): MutableHarmonyCommand {
  return {
    id: command.id,
    name: command.name,
    label: command.label,
    deviceId: command.deviceId,
    group: command.group,
  };
}

/**
 * Convert a readonly HarmonyDevice to a mutable one
 */
export function toMutableDevice(device: HarmonyDevice): MutableHarmonyDevice {
  return {
    id: device.id,
    name: device.name,
    type: device.type,
    commands: device.commands.map(toMutableCommand),
  };
}

/**
 * Convert a readonly HarmonyActivity to a mutable one
 */
export function toMutableActivity(activity: HarmonyActivity): MutableHarmonyActivity {
  return {
    id: activity.id,
    name: activity.name,
    type: activity.type,
    isCurrent: activity.isCurrent,
  };
}

/**
 * Convert a readonly LoadingState to a mutable one
 */
export function toMutableLoadingState(state: LoadingState): MutableLoadingState {
  return {
    stage: state.stage,
    progress: state.progress,
    message: state.message,
  };
}
