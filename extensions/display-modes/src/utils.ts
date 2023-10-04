import { environment } from "@raycast/api";
import { execa } from "execa";
import { chmod } from "fs/promises";
import { join } from "path";
import { DisplayInfo, Mode } from "./types";

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
