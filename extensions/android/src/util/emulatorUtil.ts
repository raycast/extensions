import { adbPath, emulatorPath, executeAsync, runCommand } from "./utils";
import { Emulator, EmulatorState } from "../types/Emulator";

async function getEmulatorsData(
  emulatorsResponse: string[]
): Promise<Emulator[]> {
  const emulatorStatusPromises = emulatorsResponse.map(async (emu) => {
    try {
      const emulatorName = (
        await executeAsync(`${adbPath} -s ${emu} emu avd name`)
      )
        .split("\n")[0]
        .trim();
      const device: Emulator = {
        id: emu,
        name: emulatorName,
        state: EmulatorState.Running,
      };

      if (emulatorName.length === 0) {
        return undefined;
      }
      return device;
    } catch (error) {
      console.error("Error:", error);
    }
  });

  const emulators = (await Promise.all(emulatorStatusPromises)).filter(
    (item): item is Emulator => Boolean(item)
  );
  return emulators;
}
export async function getRunningEmulators(): Promise<Emulator[]> {
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
            return (
              split.length > 0 &&
              split[0].startsWith("emulator") &&
              split[1] !== "offline"
            );
          })
          .map((item) => item.split("\t")[0]);

        const emulators = await getEmulatorsData(emulatorsResponse);
        return emulators;
      }
    }
  }
  return [];
}
export async function getEmulators(): Promise<Emulator[]> {
  const avdsResponse = await executeAsync(`${emulatorPath} -list-avds`);
  if (avdsResponse.length > 0) {
    const runningEmulators = await getRunningEmulators();
    const emulators = avdsResponse
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => !item.startsWith("INFO    |") && item.length > 0)
      .map((item) => {
        const runningEmulator = runningEmulators.find(
          (runningEmulator) => runningEmulator.name === item
        );
        const emulator: Emulator = {
          name: item,
          id: runningEmulator?.id ?? "",
          state: runningEmulator
            ? EmulatorState.Running
            : EmulatorState.Shutdown,
        };
        return emulator;
      })
      .sort((a, b) => {
        if (a.state === EmulatorState.Running) {
          return -1;
        }
        return 0;
      });

    return emulators;
  }
  return [];
}

export async function startEmulator(
  emulatorName: string,
  output: ((out: string) => void) | undefined,
  error: ((error: string) => void) | undefined
) {
  runCommand(`${emulatorPath} @${emulatorName}`, output, error);
}
