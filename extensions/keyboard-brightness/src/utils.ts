import { execa } from "execa";
import { join } from "path";
import { LocalStorage, Toast, environment, showToast } from "@raycast/api";
import { chmod } from "fs/promises";
import { GetBrightness } from "./types";

const executeCommand = async (args: string[]) => {
  const command = join(environment.assetsPath, "keyboard");
  await chmod(command, "755");
  return await execa(command, args);
};

const getSystemBrightness = async () => {
  try {
    const { stdout } = await executeCommand(["get"]);
    const { brightness } = JSON.parse(stdout) as GetBrightness;
    return brightness;
  } catch (e) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: (e as Error).message,
    });
  }
};

const setSystemBrightness = async (brightness: number) => {
  try {
    await executeCommand(["set", String(brightness)]);
    return brightness;
  } catch (e) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: (e as Error).message,
    });
  }
};

const getStoredBrightness = async () => {
  return await LocalStorage.getItem<number>("brightness");
};

const setStoredBrightness = async (brightness: number) => {
  await LocalStorage.setItem("brightness", brightness);
};

const adjustBrightness = async (
  brightness: number,
  direction: "increase" | "decrease",
) => {
  try {
    const adjustment = direction === "increase" ? 0.1 : -0.1;

    const newBrightness = parseFloat(
      Math.min(Math.max((brightness || 0) + adjustment, 0), 1).toFixed(2),
    );

    await setSystemBrightness(newBrightness);

    showToast({
      style: direction === "increase" ? Toast.Style.Success : Toast.Style.Failure,
      title: `Keyboard Brightness ${
        direction === "increase" ? "increased" : "decreased"
      }!`,
    });
  } catch (e) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: (e as Error).message,
    });
  }
};

export {
  getSystemBrightness,
  adjustBrightness,
  setSystemBrightness,
  getStoredBrightness,
  setStoredBrightness,
};
