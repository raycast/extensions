import { loadDevicesWithFallback } from "../utils/deviceSource";
import { describeAccount, describeDeviceForAI } from "../utils/deviceSemantics";

type Input = {
  /**
   * Optional case-insensitive substring to narrow the list by device name.
   * Omit it to return every device on the account.
   */
  nameContains?: string;
};

/**
 * Lists the Tuya devices on the account with their current state already formatted:
 * switches and whether they are on, sensor readings such as temperature, humidity and
 * contact state, remaining battery, and anything needing attention.
 */
export default async function tool(input: Input) {
  const { devices, source } = await loadDevicesWithFallback();
  const needle = input.nameContains?.trim().toLowerCase();

  const filtered = needle ? devices.filter((device) => device.name.toLowerCase().includes(needle)) : devices;

  const listed = filtered.map(describeDeviceForAI);

  return {
    overview: describeAccount(filtered),
    // "cache" means the Tuya cloud was unreachable and this is the last known state.
    source,
    devices: listed,
  };
}
