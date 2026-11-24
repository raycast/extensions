import { exec as Exec } from "node:child_process";
import { promisify } from "node:util";
import { environment } from "@raycast/api";

import { ILayout, ILayoutManager } from "./interfaces";
import { activateWindowsLayout, getWindowsLayouts, toggleWindowsLayout } from "./win32";

const exec = promisify(Exec);

const isWindows = process.platform === "win32";

const setPermissions = async () => {
  return exec(`/bin/chmod u+x ${environment.assetsPath}/keyboardSwitcher`);
};

const fetchData = async (): Promise<{ stdout: string; stderr: string }[]> => {
  return await Promise.all([
    exec(`${environment.assetsPath}/keyboardSwitcher json`),
    exec(`${environment.assetsPath}/keyboardSwitcher get`),
  ]);
};

export const LayoutManager: ILayoutManager = class Layout implements ILayout {
  static activeInput?: string;
  static activeInputId?: string;

  private constructor(
    readonly id: string,
    readonly title: string,
  ) {}

  get active(): boolean {
    return isWindows ? this.id === LayoutManager.activeInputId : this.title === LayoutManager.activeInput;
  }

  public async activate(waitForForegroundPid = 0): Promise<void> {
    if (isWindows) {
      await activateWindowsLayout(this.id, waitForForegroundPid);
      return;
    }

    const result = await exec(`${environment.assetsPath}/keyboardSwitcher select '${this.id}'`);
    const status = result.stdout.split("\n")[1];
    if (status === "found") {
      return;
    } else {
      throw new Error(`Layout "${this.title}" Not Found`);
    }
  }

  static async getAll() {
    if (isWindows) {
      const inputs = await getWindowsLayouts();
      const activeInput = inputs.find((input) => input.active);
      LayoutManager.activeInput = activeInput?.title;
      LayoutManager.activeInputId = activeInput?.id;
      const sources = inputs.map((input) => new Layout(input.id, input.title));
      return sources.sort((a, b) => a.title.localeCompare(b.title));
    }

    await setPermissions();

    // Fetch data
    const [inputsResult, activeResult] = await fetchData();

    // Set active source
    LayoutManager.activeInput = activeResult.stdout.split("\n")[0];

    // Create instances
    const rawSources = JSON.parse(inputsResult.stdout);
    const sources: Array<ILayout> = [];
    for (const obj of rawSources) {
      sources.push(new Layout(obj.arg, obj.title));
    }
    return sources.sort((a, b) => a.title.localeCompare(b.title));
  }

  static async setNextInput(waitForForegroundPid = 0) {
    if (isWindows) {
      const toggled = await toggleWindowsLayout(waitForForegroundPid);
      return new Layout(toggled.id, toggled.title);
    }

    const allLayouts = await LayoutManager.getAll();

    // Select the input right after the active layout or the first one if the active layout is the last one
    let selected: ILayout = allLayouts[0];
    for (let i = 0; i < allLayouts.length; i++) {
      if (allLayouts[i].active) {
        selected = i + 1 < allLayouts.length ? allLayouts[i + 1] : selected;
        break;
      }
    }

    await selected.activate();
    return selected;
  }
};
