import { Buffer } from "node:buffer";
import path from "node:path";
import { access, constants } from "node:fs/promises";
import process from "node:process";
import { Color, Icon, Image, Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import { $ } from "execa";
import { ProcessDescription, StartOptions } from "pm2";
import { get } from "lodash";
import { Pm2Command, Pm2Process, ProcessStatus, RuntimeOptions } from "./types.js";

export const raycastNodePath = process.execPath;
export const pm2WrapperPath = path.join(environment.assetsPath, "pm2-wrapper");
export const pm2WrapperIndexPath = path.join(pm2WrapperPath, "index.js");
export const pm2WrapperExamplePath = path.join(pm2WrapperPath, "example.js");

export const setupPm2Wrapeper = async () => {
  const { nodePath, npmPath } = getPreferenceValues<Preferences>();
  await $({ cwd: pm2WrapperPath })`${nodePath} ${npmPath} ci --omit=dev`;
};

export const hasPm2WrapperInstalled = async () => {
  const nodeModulesPath = path.join(pm2WrapperPath, "node_modules");
  return access(nodeModulesPath, constants.R_OK | constants.W_OK)
    .then(() => true)
    .catch(() => false);
};

export const base64Encode = (str: string) => Buffer.from(str).toString("base64");

export const encodeParameters = (parameters: StartOptions | Pm2Process) => base64Encode(JSON.stringify(parameters));

export const getNodeBinaryPath = (runtimeOptions?: RuntimeOptions) => {
  const { defaultNodeExecutor, nodePath } = getPreferenceValues<Preferences>();
  return runtimeOptions?.nodePath ?? (defaultNodeExecutor === "raycastNodePath" ? raycastNodePath : nodePath);
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
  const toast = await showToast({ title: "", message: `Running ${command} command...` });
  const nodeBinaryPath = getNodeBinaryPath(runtimeOptions);
  const commandLine = `PATH="$PATH:${path.dirname(nodeBinaryPath)}" '${nodeBinaryPath}' '${pm2WrapperIndexPath}' ${command} --options=${encodeParameters(options)}`;
  try {
    await $({
      shell: true,
      cwd: path.dirname(pm2WrapperIndexPath),
    })(commandLine);
    toast.style = Toast.Style.Success;
    toast.message = `Operation done`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.message = error?.toString() ?? `Fail to execute '${commandLine}'`;
  }
}

export const checkIfNeedSetup = async () => {
  const installed = await hasPm2WrapperInstalled();
  if (!installed) {
    const toast = await showToast({ title: "", message: "Setting up PM2 wrappers for Raycast..." });
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
