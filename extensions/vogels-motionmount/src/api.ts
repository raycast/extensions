import { closeMainWindow, LocalStorage, showHUD } from "@raycast/api";
import * as swift from "swift:../swift";
import { Position } from "./format";

export type { Position };
export type Preset = { index: number; name: string; position: Position };
export type Status = { deviceID?: string; position: Position; presets: Preset[] };
export type Diagnostics = { status: "running" | "passed" | "failed"; step?: number; totalSteps: number; code?: number };

export const PRESET_SLOTS = 10;

const DEVICE_KEY = "deviceID";

const deviceID = async () => (await LocalStorage.getItem<string>(DEVICE_KEY)) ?? "";

export async function getStatus(): Promise<Status> {
  const status: Status = await swift.getStatus(await deviceID());
  if (status.deviceID) await LocalStorage.setItem(DEVICE_KEY, status.deviceID);
  return status;
}

export const goTo = async ({ distance, rotation }: Position): Promise<Position> =>
  swift.goTo(await deviceID(), distance, rotation);
export const addPreset = async (name: string, { distance, rotation }: Position): Promise<Preset> =>
  swift.addPreset(await deviceID(), name, distance, rotation);
export const updatePreset = async (index: number, name: string, { distance, rotation }: Position): Promise<Preset> =>
  swift.updatePreset(await deviceID(), index, name, distance, rotation);
export const deletePreset = async (index: number): Promise<void> => swift.deletePreset(await deviceID(), index);
export const startDiagnostics = async (): Promise<void> => swift.startDiagnostics(await deviceID());
export const getDiagnostics = async (): Promise<Diagnostics> => swift.getDiagnostics(await deviceID());

export async function moveTo(name: string, position: Position) {
  await closeMainWindow();
  await showHUD(`Moving to ${name}…`);
  try {
    await goTo(position);
  } catch (error) {
    await showHUD(`Could not move the MotionMount: ${(error as Error).message}`);
  }
}
