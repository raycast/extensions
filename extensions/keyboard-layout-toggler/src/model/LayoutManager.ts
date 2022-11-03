import { exec as Exec } from "child_process";
import { promisify } from "util";
import { environment } from "@raycast/api";

import { ILayout, ILayoutManager } from "./interfaces";

const exec = promisify(Exec);

export const LayoutManager: ILayoutManager = class Layout implements ILayout {
  private constructor(readonly id: string, readonly title: string) {}

  public async activate(): Promise<void> {
    const result = await exec(`${environment.assetsPath}/keyboardSwitcher select '${this.id}'`);
    const status = result.stdout.split("\n")[1];
    if (status === "found") {
      return;
    } else {
      throw new Error(`Layout "${this.title}" Not Found`);
    }
  }

  static async nextInput(setPermissions = true) {
    if (setPermissions === true) {
      await exec(`/bin/chmod u+x ${environment.assetsPath}/keyboardSwitcher`);
    }

    // Fetch data
    const [inputsResult, activeResult] = await Promise.all([
      exec(`${environment.assetsPath}/keyboardSwitcher json`),
      exec(`${environment.assetsPath}/keyboardSwitcher get`),
    ]);

    // Get active input
    const activeInput = activeResult.stdout.split("\n")[0];

    // Get all inputs
    const rawSources = JSON.parse(inputsResult.stdout);

    // Select the input right after the activeInput or the first one if the activeInput is the last one
    let selected: ILayout = new Layout(rawSources[0].arg, rawSources[0].title);
    for (let i = 0; i < rawSources.length; i++) {
      if (rawSources[i].title === activeInput) {
        selected = i + 1 < rawSources.length ? new Layout(rawSources[i + 1].arg, rawSources[i + 1].title) : selected;
        break;
      }
    }

    await selected.activate();
    return selected;
  }
};
