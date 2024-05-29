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
    if (brightness <= 0 && direction === "decrease") {
      showToast({
        style: Toast.Style.Failure,
        title: "Brightness is already at 0%",
      });

      return;
    } else if (brightness >= 1 && direction === "increase") {
      showToast({
        style: Toast.Style.Failure,
        title: "Brightness is already at 100%",
      });

      return;
    }

    const adjustment = direction === "increase" ? 0.1 : -0.1;
    let newBrightness = brightness + adjustment;
    // ensure that brightness is between 0 and 1
    newBrightness = Math.max(0, newBrightness);
    newBrightness = Math.min(1, newBrightness);
    await setSystemBrightness(newBrightness);

    showToast({
      style: Toast.Style.Success,
      title: `Keyboard Brightness ${
        direction === "increase" ? "increased" : "decreased"
      } to ${(newBrightness * 100).toFixed(0)}%`,
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
