import { getDashboard } from "../lib/automation";
import { getRoutines } from "../lib/routine-store";
import { getInstructionSettings } from "../lib/instruction-store";
import { getSelectedDevice } from "../lib/storage";

/** Read saved TVs, their current app/input and configured routines. Sends no remote commands. */
export default async function tool() {
  const [devices, routines, settings, selected] = await Promise.all([
    getDashboard(),
    getRoutines(),
    getInstructionSettings(),
    getSelectedDevice(),
  ]);
  return {
    defaultDeviceId: selected?.id,
    devices: devices.map(({ device, reachable, activeApp, powerMode, controlMode, error }) => ({
      id: device.id,
      name: device.name,
      reachable,
      activeApp,
      powerMode,
      controlMode,
      error,
    })),
    routines,
    settings,
  };
}
