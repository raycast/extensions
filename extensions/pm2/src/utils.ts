import { Buffer } from "node:buffer";
import path from "node:path";
import { access, constants } from "node:fs/promises";
import process from "node:process";
import { Color, Icon, Image, Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import spawn from "nano-spawn";
import { ProcessDescription, StartOptions } from "pm2";
import get from "lodash/get.js";
import { Pm2Command, Pm2Process, ProcessStatus, RuntimeOptions } from "./types.js";

export const raycastNodePath = process.execPath;
export const pm2WrapperPath = path.join(environment.assetsPath, "pm2-wrapper");
export const pm2WrapperIndexPath = path.join(pm2WrapperPath, "index.js");
export const pm2WrapperExamplePath = path.join(pm2WrapperPath, "example.js");

export const fakeToast = async (): Promise<Toast> => {
  return new Toast({ title: "" });
};

export const setupPm2Wrapeper = async () => {
  const { nodePath, npmPath } = getPreferenceValues<Preferences>();
  await spawn(nodePath, [npmPath, "ci", "--omit=dev"], { cwd: pm2WrapperPath, shell: true });
};

export const hasPm2WrapperInstalled = async () => {
  const nodeModulesPath = path.join(pm2WrapperPath, "node_modules");
  return access(nodeModulesPath, constants.R_OK | constants.W_OK)
    .then(() => true)
    .catch(() => false);
};

export const base64Encode = (str: string) => Buffer.from(str).toString("base64");

export const encodeParameters = (parameters: StartOptions | Pm2Process) => base64Encode(JSON.stringify(parameters));

export const setupEnv = (options?: { runtimeOptions?: RuntimeOptions }) => {
  const { defaultNodeExecutor, nodePath, pm2Home } = getPreferenceValues<Preferences>();
  const nodeBinaryPath = path.dirname(
    options?.runtimeOptions?.nodePath ?? (defaultNodeExecutor === "raycastNodePath" ? raycastNodePath : nodePath),
  );

  if (!process.env.PATH?.includes(nodeBinaryPath)) {
    process.env.PATH = process.env.PATH ? `${process.env.PATH}:${nodeBinaryPath}` : nodeBinaryPath;
  }

  if (pm2Home) {
    process.env.PM2_HOME = pm2Home;
  }
};

export async function runPm2Command(
  command: "start",
  options: StartOptions | Pm2Process,
  runtimeOptions?: RuntimeOptions,
): Promise<void>;

export async function runPm2Command(
  command: Exclude<Pm2Command, "start">,
  options: Pm2Process,
  runtimeOptions?: RuntimeOptions,
): Promise<void>;

export async function runPm2Command(
  command: Pm2Command,
  options: StartOptions | Pm2Process,
  runtimeOptions?: RuntimeOptions,
): Promise<void> {
  if (options === undefined || options === "") {
    console.error("No options provided for PM2 command");
    return;
  }
  setupEnv({ runtimeOptions });
  const commands = [pm2WrapperIndexPath, command, `--options=${encodeParameters(options)}`];
  const toast =
    environment.commandMode === "view"
      ? await showToast({ title: "", message: `Running ${command} command...` })
      : await fakeToast();
  try {
    await spawn("node", [pm2WrapperIndexPath, command, `--options=${encodeParameters(options)}`], {
      cwd: path.dirname(pm2WrapperIndexPath),
    });
    toast.style = Toast.Style.Success;
    toast.message = `Operation done`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.message = error?.toString() ?? `Fail to execute 'node ${commands.join(" ")}'`;
  }
}

export const checkIfNeedSetup = async () => {
  const installed = await hasPm2WrapperInstalled();
  if (!installed) {
    const toast =
      environment.commandMode === "view"
        ? await showToast({ title: "", message: "Setting up PM2 wrappers for Raycast..." })
        : await fakeToast();
    try {
      await setupPm2Wrapeper();
      toast.style = Toast.Style.Success;
      toast.message = "PM2 wrappers for Raycast are set up";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.message = error?.toString() ?? "Fail to setup PM2 wrappers for Raycast";
    }
  }
};

export const getProcessStatusColor = (status?: ProcessStatus) => {
  switch (status) {
    case "online":
      return Color.Green;
    case "stopping":
      return Color.Yellow;
    case "stopped":
      return Color.SecondaryText;
    case "launching":
      return Color.Blue;
    case "errored":
      return Color.Orange;
    case "one-launch-status":
      return Color.Magenta;
    default:
      return Color.PrimaryText;
  }
};

export const isRaycastNodeProcess = (processDescription: ProcessDescription) =>
  get(processDescription, "pm2_env._", "")?.includes("com.raycast.macos");

export const ellipsis = (text: string, maxLength = 8) => {
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
};

export const getRaycastIcon = (): Image.ImageLike => {
  return {
    source: environment.appearance === "light" ? Icon.RaycastLogoPos : Icon.RaycastLogoNeg,
    tintColor: "FF6363",
  };
};
