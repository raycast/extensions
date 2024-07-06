import { Buffer } from "node:buffer";
import path from "node:path";
import process from "node:process";
import { Color, Icon, Image, Toast, environment, showToast } from "@raycast/api";
import pm2, { ProcessDescription, StartOptions } from "pm2";
import { get } from "lodash";
import { Pm2Command, Pm2Process, ProcessStatus } from "./types.js";

export const raycastNodePath = process.execPath;
export const pm2ExamplePath = path.join(environment.assetsPath, "example.mjs");

export const fakeToast = async (): Promise<Toast> => {
  return new Toast({ title: "" });
};

export const base64Encode = (str: string) => Buffer.from(str).toString("base64");

export const encodeParameters = (parameters: StartOptions | Pm2Process) => base64Encode(JSON.stringify(parameters));

export const setupNodeEnv = () => {
  const raycastNodeDirectory = path.dirname(raycastNodePath);
  if (!process.env.PATH?.includes(raycastNodeDirectory)) {
    process.env.PATH = process.env.PATH ? `${raycastNodeDirectory}:${process.env.PATH}` : raycastNodeDirectory;
  }
};

export const handlePm2Error = (error: Error) => {
  if (error) throw error;
};

export async function runPm2Command(command: "start", options: StartOptions | Pm2Process): Promise<void>;

export async function runPm2Command(command: Exclude<Pm2Command, "start">, options: Pm2Process): Promise<void>;

export async function runPm2Command(command: Pm2Command, options: StartOptions | Pm2Process): Promise<void> {
  if (options === undefined || options === "") {
    console.error("No options provided for PM2 command");
    return;
  }
  const toast =
    environment.commandMode === "view"
      ? await showToast({ title: "", message: `Running ${command} command...` })
      : await fakeToast();
  return new Promise((resolve) => {
    setupNodeEnv();
    try {
      // @ts-expect-error: This type usage is fine
      pm2[command](options, (error) => {
        handlePm2Error(error);
        toast.style = Toast.Style.Success;
        toast.message = `Operation done`;
        resolve();
      });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.message = error?.toString() ?? `Fail to execute '${command}'`;
    }
  });
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
  get(processDescription, "pm2_env._", "")?.includes("com.raycast.macos") ||
  get(processDescription, "pm2_env.env.RAYCAST_VERSION", "");

export const ellipsis = (text: string, maxLength = 8) => {
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
};

export const getRaycastIcon = (): Image.ImageLike => {
  return {
    source: environment.appearance === "light" ? Icon.RaycastLogoPos : Icon.RaycastLogoNeg,
    tintColor: "FF6363",
  };
};
