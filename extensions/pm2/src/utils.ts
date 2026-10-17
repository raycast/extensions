import path from "node:path";
import process from "node:process";
import { Color, Icon, Image, Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import pm2, { type ProcessDescription, type StartOptions } from "pm2";
import get from "lodash/get.js";
import { Pm2Command, Pm2Process, ProcessStatus, RuntimeOptions } from "./types.js";

export const raycastNodePath = process.execPath;
export const pm2ExamplePath = path.join(environment.assetsPath, "example.js");

type Pm2Api = typeof pm2;
type Pm2ApiConstructor = new (options?: { pm2_home?: string }) => Pm2Api;
type Pm2Module = Pm2Api & { custom?: Pm2ApiConstructor };

export const fakeToast = async (): Promise<Toast> => {
  return new Toast({ title: "" });
};

const getPm2Client = (): Pm2Api => {
  const { pm2Home } = getPreferenceValues<Preferences>();
  const CustomPm2 = (pm2 as Pm2Module).custom;

  return pm2Home && CustomPm2 ? new CustomPm2({ pm2_home: pm2Home }) : pm2;
};

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

const connectPm2 = (pm2Client: Pm2Api) =>
  new Promise<void>((resolve, reject) => {
    pm2Client.connect((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const disconnectPm2 = (pm2Client: Pm2Api) => {
  pm2Client.disconnect();
};

export const listPm2Processes = async (runtimeOptions?: RuntimeOptions) => {
  setupEnv({ runtimeOptions });
  const pm2Client = getPm2Client();

  await connectPm2(pm2Client);

  try {
    return await new Promise<ProcessDescription[]>((resolve, reject) => {
      pm2Client.list((error, list) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(list);
      });
    });
  } finally {
    disconnectPm2(pm2Client);
  }
};

type Pm2OperationCallback = (error?: Error | null) => void;

const runPm2Operation = (pm2Client: Pm2Api, command: Pm2Command, options: StartOptions | Pm2Process) =>
  new Promise<void>((resolve, reject) => {
    const onComplete: Pm2OperationCallback = (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    switch (command) {
      case "start":
        (pm2Client.start as unknown as (options: StartOptions | Pm2Process, callback: Pm2OperationCallback) => void)(
          options,
          onComplete,
        );
        break;
      case "stop":
        pm2Client.stop(options as Pm2Process, onComplete);
        break;
      case "restart":
        pm2Client.restart(options as Pm2Process, onComplete);
        break;
      case "reload":
        pm2Client.reload(options as Pm2Process, onComplete);
        break;
      case "delete":
        pm2Client.delete(options as Pm2Process, onComplete);
        break;
    }
  });

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
  const pm2Client = getPm2Client();
  let isConnected = false;
  const toast =
    environment.commandMode === "view"
      ? await showToast({ title: "", message: `Running ${command} command...` })
      : await fakeToast();
  try {
    await connectPm2(pm2Client);
    isConnected = true;
    await runPm2Operation(pm2Client, command, options);
    toast.style = Toast.Style.Success;
    toast.message = `Operation done`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.message = error?.toString() ?? `Fail to execute PM2 ${command}`;
  } finally {
    if (isConnected) {
      disconnectPm2(pm2Client);
    }
  }
}

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
