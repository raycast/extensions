import { closeMainWindow, environment, getPreferenceValues, PopToRootType } from "@raycast/api";
import { execa, ExecaError } from "execa";
import { join } from "path";
import { MenuBar, MenuBarError } from "./types";
import { chmod } from "fs/promises";

export function Settings(SettingName: string): boolean {
  const Settings = getPreferenceValues();
  return Settings[SettingName];
}

async function prepareCommand(): Promise<string> {
  const command = join(environment.assetsPath, "menu-bar");
  await chmod(command, 0o755);
  return command;
}

export async function getMenuBar(): Promise<MenuBar[]> {
  const command = await prepareCommand();

  try {
    const { stdout } = await execa(command, ["-async"]);
    return JSON.parse(stdout) as MenuBar[];
  } catch (error: any) {
    const { stdout } = error as ExecaError;
    const { message } = JSON.parse(stdout) as MenuBarError;
    throw new Error(`Failed to get menu bar: ${message}`);
  }
}

export async function clickMenuBarOption(arg: string): Promise<void> {
  const command = await prepareCommand();

  try {
    // need to close the main window before clicking the menu bar, otherwise some apps will not respond, e.g. VSCode
    closeMainWindow({
      popToRootType: Settings("popToRootAfterAction") ? PopToRootType.Immediate : PopToRootType.Suspended,
    });

    await execa(command, ["-click", arg]);
  } catch (error: any) {
    throw new Error(`Failed to click menu bar option: ${error.message}`);
  }
}
