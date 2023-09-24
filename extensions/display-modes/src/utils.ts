import { environment, getPreferenceValues, Icon, Image, Keyboard, List } from "@raycast/api";
import { execa, ExecaError } from "execa";
import { chmod } from "fs/promises";
import { join } from "path";
import { DisplayInfo, Mode } from "./types";

const preferences: Preferences = getPreferenceValues();

export async function listDisplays(): Promise<DisplayInfo[] | undefined> {
  const command = join(environment.assetsPath, "display-modes");
  await chmod(command, "755");

  try {
    const { stdout } = await execa(command, ["list-displays", "--json"]);

    const parsed: DisplayInfo[] = JSON.parse(stdout);

    return parsed;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function setMode(displayId: number, mode: Mode): Promise<boolean | undefined> {
  const command = join(environment.assetsPath, "display-modes");
  await chmod(command, "755");

  try {
    const { stdout } = await execa(command, [
      "set-mode",
      `${displayId}`,
      "-w",
      `${mode.width}`,
      "-h",
      `${mode.height}`,
      "-s",
      `${mode.scale}`,
      "-r",
      `${mode.refreshRate}`,
      "--json",
    ]);

    const parsed: boolean = JSON.parse(stdout);

    return parsed;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export function numberToKey(n: number): Keyboard.KeyEquivalent | undefined {
  switch (n) {
    case 1:
      return "1";
    case 2:
      return "2";
    case 3:
      return "3";
    case 4:
      return "4";
    case 5:
      return "5";
    case 6:
      return "6";
    case 7:
      return "7";
    case 8:
      return "8";
    case 9:
      return "9";
    default:
      return undefined;
  }
}
