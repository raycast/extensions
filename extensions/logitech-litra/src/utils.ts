import fs from "fs";
import { promisify } from "util";
import { exec as defaultExec } from "child_process";
import { gte, parse } from "semver";
import { Device } from "./types";
const exec = promisify(defaultExec);

const joinWordsWithCommasThenOr = (words: string[]): string => {
  if (words.length === 0) {
    return "";
  } else if (words.length === 1) {
    return words[0];
  } else {
    const lastWord = words.pop();
    return `${words.join(", ")} or ${lastWord}`;
  }
};

const MINIMUM_SUPPORTED_LITRA_VERSION = "2.4.0";
const SUPPORTED_MAJOR_LITRA_VERSIONS = [2];
const ALLOWED_MAJOR_VERSIONS_STRING = joinWordsWithCommasThenOr(
  SUPPORTED_MAJOR_LITRA_VERSIONS.map((majorVersion) => `v${majorVersion}.x`),
);

export const checkLitraVersion = async (binaryPath: string): Promise<void> => {
  const version = await getLitraVersion(binaryPath);
  const parsedVersion = parse(version);

  if (!parsedVersion) {
    throw `The version of the \`litra\` CLI could not be detected. Please check the extension's preferences, and make sure that you're pointing to the \`litra\` CLI`;
  }

  if (gte(version, MINIMUM_SUPPORTED_LITRA_VERSION)) {
    if (!SUPPORTED_MAJOR_LITRA_VERSIONS.includes(parsedVersion.major)) {
      throw `You are running v${version} of the \`litra\` CLI which is too new for this Raycast extension. Please downgrade to an earlier version - you must use at least v${MINIMUM_SUPPORTED_LITRA_VERSION}, and it must be a ${ALLOWED_MAJOR_VERSIONS_STRING} version. To download a supported version, see https://github.com/timrogers/litra-rs`;
    }
  } else {
    throw `You are running an old version of the \`litra\` CLI, v${version}. Please upgrade to a more recent version - you must use at least v${MINIMUM_SUPPORTED_LITRA_VERSION}, and it must be a ${ALLOWED_MAJOR_VERSIONS_STRING} version. For details on how to install the latest version, see https://github.com/timrogers/litra-rs`;
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

export const isOn = async (devicePath: string, binaryPath: string): Promise<boolean> => {
  const devices = await getDevices(binaryPath);
  const device = devices.find((device) => device.device_path === devicePath) as Device;
  return device.is_on;
};

export const toggle = async (devicePath: string, binaryPath: string): Promise<void> => {
  await runLitraCommand(binaryPath, "toggle", `--device-path ${devicePath}`);
};

export const setTemperatureInKelvin = async (
  devicePath: string,
  temperatureInKelvin: number,
  binaryPath: string,
): Promise<void> => {
  await runLitraCommand(binaryPath, "temperature", `--value ${temperatureInKelvin} --device-path ${devicePath}`);
};

export const setBrightnessPercentage = async (
  devicePath: string,
  brightnessPercentage: number,
  binaryPath: string,
): Promise<void> => {
  await runLitraCommand(binaryPath, "brightness", `--percentage ${brightnessPercentage} --device-path ${devicePath}`);
};
