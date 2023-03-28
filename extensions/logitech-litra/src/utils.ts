import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec as defaultExec } from "child_process";
const exec = promisify(defaultExec);

interface Device {
  name: string;
  serial_number: string;
}

const runLitraCommand = (
  directory: string,
  filename: string,
  args?: string
): Promise<{
  stdout: string;
  stderr: string;
}> => {
  const binPath = path.join(directory, filename);

  if (fs.existsSync(binPath)) {
    return exec(`${binPath} ${args}`);
  } else {
    throw `The CLI utility \`${filename}\` is not available in \`${directory}\`. Please check the extension's preferences.`;
  }
};

export const getDevices = async (cliDirectory: string): Promise<Device[]> => {
  const { stdout } = await runLitraCommand(cliDirectory, "litra-devices", "--json");
  return JSON.parse(stdout) as Device[];
};

export const turnOn = async (cliDirectory: string, serialNumber: string): Promise<void> => {
  await runLitraCommand(cliDirectory, "litra-on", `--serial-number ${serialNumber}`);
};

export const turnOff = async (cliDirectory: string, serialNumber: string): Promise<void> => {
  await runLitraCommand(cliDirectory, "litra-off", `--serial-number ${serialNumber}`);
};

export const setTemperatureInKelvin = async (
  cliDirectory: string,
  serialNumber: string,
  temperatureInKelvin: number
): Promise<void> => {
  await runLitraCommand(cliDirectory, "litra-temperature-k", `${temperatureInKelvin} --serial-number ${serialNumber}`);
};

export const setBrightnessPercentage = async (
  cliDirectory: string,
  serialNumber: string,
  brightnessPercentage: number
): Promise<void> => {
  await runLitraCommand(cliDirectory, "litra-brightness", `${brightnessPercentage} --serial-number ${serialNumber}`);
};
