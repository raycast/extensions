import { spawn } from "child_process";
import { Emulator } from "./types";
import { executeAsync, adbPath, emulatorPath } from "./util";

async function getEmulatorsData(emulatorsResponse: string[]): Promise<Emulator[]> {
  const emulatorStatusPromises = emulatorsResponse.map(async (emu) => {
    try {
      const emulatorName = (await executeAsync(`${adbPath} -s ${emu} emu avd name`)).split("\n")[0].trim();
      const device: Emulator = {
        id: emu,
        name: emulatorName,
      };

      if (emulatorName.length === 0) {
        return undefined;
      }
      return device;
    } catch (error) {
      console.error("Error:", error);
    }
  });

  const emulators = (await Promise.all(emulatorStatusPromises)).filter((item): item is Emulator => Boolean(item));
  return emulators;
}
export async function getEmulators(): Promise<Emulator[]> {
  const response = await executeAsync(`${adbPath} devices`);

  const sep = "List of devices attached\n";
  const stdSplit = response.split(sep);
  if (stdSplit.length > 0) {
    const devicesStr = stdSplit[1].trim();
    if (devicesStr.length > 0) {
      const devices = devicesStr.split("\n");
      if (devices.length > 0) {
        const emulatorsResponse = devices
          .filter((item) => {
            const split = item.split("\t");
            return split.length > 0 && split[0].startsWith("emulator") && split[1] !== "offline";
          })
          .map((item) => item.split("\t")[0]);

        const emulators = await getEmulatorsData(emulatorsResponse);
        return emulators;
      }
    }
  }
  return [];
}

export async function startEmulator(name: string) {
  const command = `"${emulatorPath}" -avd ${name}`;
  spawn(command, [], { shell: true });
}
