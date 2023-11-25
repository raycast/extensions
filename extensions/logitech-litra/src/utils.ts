import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec as defaultExec } from "child_process";
import gte from "semver/functions/gte";
import parse from "semver/functions/parse";
const exec = promisify(defaultExec);

interface Device {
  name: string;
  serial_number: string;
  is_on: boolean;
}

const MINIMUM_SUPPORTED_LITRA_VERSION = "4.4.0";

export const checkLitraVersion = async (cliDirectory: string, nodeBinaryPath?: string): Promise<void> => {
  const version = await getLitraVersion(cliDirectory, nodeBinaryPath);

  if (gte(version, MINIMUM_SUPPORTED_LITRA_VERSION)) {
    if (parse(version)?.major != parse(MINIMUM_SUPPORTED_LITRA_VERSION)?.major) {
      throw `You are running v${version} of the \`litra\` package which is too new for this Raycast extension. Please downgrade to v${MINIMUM_SUPPORTED_LITRA_VERSION} or a later version within the same major version by running \`npm install -g litra@${MINIMUM_SUPPORTED_LITRA_VERSION}\`.`;
    }
  } else {
    throw `You are running an old version of the \`litra\` package, v${version}. You must be running v${MINIMUM_SUPPORTED_LITRA_VERSION} or a later version within the same major version. Please update by running \`npm install -g litra@${MINIMUM_SUPPORTED_LITRA_VERSION}\`.`;
  }
};

const getLitraVersion = async (cliDirectory: string, nodeBinaryPath?: string): Promise<string> => {
  try {
    const { stdout: version } = await runLitraCommand(cliDirectory, "litra-devices", "--version", nodeBinaryPath);
    return version.trim();
  } catch (error: any) {
    if (error.stderr.includes("unknown option")) {
      throw `You seem to be running an old version of the \`litra\` package. You must be running at least v${MINIMUM_SUPPORTED_LITRA_VERSION}. Please update by running \`npm install -g litra@${MINIMUM_SUPPORTED_LITRA_VERSION}\`.`;
    } else {
      throw error;
    }
  }
};

const runLitraCommand = (
  directory: string,
  filename: string,
  args?: string,
  nodeBinaryPath?: string
): Promise<{
  stdout: string;
  stderr: string;
}> => {
  const binPath = path.join(directory, filename);

  if (fs.existsSync(binPath)) {
    const command = [nodeBinaryPath, binPath, args].filter((argument) => argument).join(" ");
    return exec(command);
  } else {
    throw `The CLI utility \`${filename}\` is not available in \`${directory}\`. Please check the extension's preferences.`;
  }
};

export const getDevices = async (cliDirectory: string, nodeBinaryPath?: string): Promise<Device[]> => {
  const { stdout } = await runLitraCommand(cliDirectory, "litra-devices", "--json", nodeBinaryPath);
  return JSON.parse(stdout) as Device[];
};

export const isOn = async (cliDirectory: string, serialNumber: string, nodeBinaryPath?: string): Promise<boolean> => {
  const devices = await getDevices(cliDirectory, nodeBinaryPath);
  const device = devices.find((device) => device.serial_number === serialNumber) as Device;
  return device.is_on;
};

export const toggle = async (cliDirectory: string, serialNumber: string, nodeBinaryPath?: string): Promise<void> => {
  await runLitraCommand(cliDirectory, "litra-toggle", `--serial-number ${serialNumber}`, nodeBinaryPath);
};

export const setTemperatureInKelvin = async (
  cliDirectory: string,
  serialNumber: string,
  temperatureInKelvin: number,
  nodeBinaryPath?: string
): Promise<void> => {
  await runLitraCommand(
    cliDirectory,
    "litra-temperature-k",
    `${temperatureInKelvin} --serial-number ${serialNumber}`,
    nodeBinaryPath
  );
};

export const setBrightnessPercentage = async (
  cliDirectory: string,
  serialNumber: string,
  brightnessPercentage: number,
  nodeBinaryPath?: string
): Promise<void> => {
  await runLitraCommand(
    cliDirectory,
    "litra-brightness",
    `${brightnessPercentage} --serial-number ${serialNumber}`,
    nodeBinaryPath
  );
};
