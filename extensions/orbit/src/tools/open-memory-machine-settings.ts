import { openMemoryMachineUrl } from "../lib/installed-app";
import { buildMemoryMachineSettingsUrl } from "../lib/memory-machine";

/**
 * Opens Memory Machine settings.
 */
export default async function openMemoryMachineSettings() {
  const url = buildMemoryMachineSettingsUrl();
  await openMemoryMachineUrl(url);

  return { url };
}
