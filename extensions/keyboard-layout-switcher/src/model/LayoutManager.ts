import { exec as Exec } from "child_process";
import { promisify } from "util";
import { environment } from "@raycast/api";

import { ILayout, ILayoutManager } from "./interfaces";

const exec = promisify(Exec);

export const LayoutManager: ILayoutManager = class Layout implements ILayout {
  static activeInput?: string;

  private constructor(readonly id: string, readonly title: string) {}

  get active(): boolean {
    return this.title === LayoutManager.activeInput;
  }

  public async activate(): Promise<void> {
    const result = await exec(`${environment.assetsPath}/keyboardSwitcher select '${this.id}'`);
    const status = result.stdout.split("\n")[1];
    if (status === "found") {
      return;
    } else {
      throw new Error(`Layout "${this.title}" Not Found`);
    }
  }

  static async getAll(setPermissions = true) {
    if (setPermissions === true) {
      await exec(`/bin/chmod u+x ${environment.assetsPath}/keyboardSwitcher`);
    }

    // Fetch data
    const [inputsResult, activeResult] = await Promise.all([
      exec(`${environment.assetsPath}/keyboardSwitcher json`),
      exec(`${environment.assetsPath}/keyboardSwitcher get`),
    ]);

    // Set active source
    LayoutManager.activeInput = activeResult.stdout.split("\n")[0];

    // Create instances
    const rawSources = JSON.parse(inputsResult.stdout);
    const sources: Array<ILayout> = [];
    for (const obj of rawSources) {
      sources.push(new Layout(obj.arg, obj.title));
    }
    return sources;
  }
};
