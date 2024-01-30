import fs from "fs";
import { promisify } from "util";
import { exec as defaultExec } from "child_process";
import gte from "semver/functions/gte";
import parse from "semver/functions/parse";
import { Device } from "./types";
const exec = promisify(defaultExec);

const MINIMUM_SUPPORTED_LITRA_VERSION = "0.2.0";

export const checkLitraVersion = async (binaryPath: string): Promise<void> => {
  const version = await getLitraVersion(binaryPath);

  if (gte(version, MINIMUM_SUPPORTED_LITRA_VERSION)) {
    if (parse(version)?.major != parse(MINIMUM_SUPPORTED_LITRA_VERSION)?.major) {
      throw `You are running v${version} of the \`litra\` CLI which is too new for this Raycast extension. Please downgrade to v${MINIMUM_SUPPORTED_LITRA_VERSION} or a later version within the same major version.`;
    }
  } else {
    throw `You are running an old version of the \`litra\` CLI, v${version}. You must be running v${MINIMUM_SUPPORTED_LITRA_VERSION} or a later version within the same major version. For details on how to install the latest version, see https://github.com/timrogers/litra-rs.`;
  }
};

const getLitraVersion = async (binaryPath: string): Promise<string> => {
  const { stdout: version } = await runLitraCommand(binaryPath, undefined, "--version");
  // The CLI returns an output like this:
  // > litra 0.1.0
  return version.trim().split(" ")[1];
};

const runLitraCommand = (
  binaryPath: string,
  subcommand: string | undefined,
  args?: string,
): Promise<{
  stdout: string;
  stderr: string;
}> => {
  if (fs.existsSync(binaryPath)) {
    const command = [binaryPath, subcommand, args].filter((argument) => argument).join(" ");
    return exec(command);
  } else {
    throw `The \`litra\` CLI could not be found at \`${binaryPath}\`. Please check the extension's preferences.`;
  }
};

export const getDevices = async (binaryPath: string): Promise<Device[]> => {
  const { stdout } = await runLitraCommand(binaryPath, "devices", "--json");
  return JSON.parse(stdout) as Device[];
};

export const isOn = async (serialNumber: string, binaryPath: string): Promise<boolean> => {
  const devices = await getDevices(binaryPath);
  const device = devices.find((device) => device.serial_number === serialNumber) as Device;
  return device.is_on;
};

export const toggle = async (serialNumber: string, binaryPath: string): Promise<void> => {
  await runLitraCommand(binaryPath, "toggle", `--serial-number ${serialNumber}`);
};

export const setTemperatureInKelvin = async (
  serialNumber: string,
  temperatureInKelvin: number,
  binaryPath: string,
): Promise<void> => {
  await runLitraCommand(binaryPath, "temperature", `--value ${temperatureInKelvin} --serial-number ${serialNumber}`);
};

export const setBrightnessPercentage = async (
  serialNumber: string,
  brightnessPercentage: number,
  binaryPath: string,
): Promise<void> => {
  await runLitraCommand(
    binaryPath,
    "brightness",
    `--percentage ${brightnessPercentage} --serial-number ${serialNumber}`,
  );
};
