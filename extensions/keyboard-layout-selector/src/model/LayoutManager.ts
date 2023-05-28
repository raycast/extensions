import { exec as Exec } from "child_process";
import { promisify } from "util";
import { environment, showHUD } from "@raycast/api";

import { LayoutType, LayoutManagerType } from "../data";

const exec = promisify(Exec);

const setPermissions = async () => {
  return exec(`/bin/chmod u+x ${environment.assetsPath}/keyboardSwitcher`);
};

const fetchData = async (): Promise<{ stdout: string; stderr: string }[]> => {
  return await Promise.all([exec(`${environment.assetsPath}/keyboardSwitcher json`)]);
};

export const LayoutManager: LayoutManagerType = class Layout implements LayoutType {
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

  static async getAll() {
    await setPermissions();

    // Fetch data
    const [inputsResult] = await fetchData();

    // Create instances
    const rawSources = JSON.parse(inputsResult.stdout);
    const sources: Array<LayoutType> = [];
    for (const obj of rawSources) {
      sources.push(new Layout(obj.arg, obj.title));
    }
    return sources.sort((a, b) => a.title.localeCompare(b.title));
  }

  static async setSelectedInput(selectedId: string) {
    // Select the input right after the active layout or the first one if the active layout is the last one
    const allLayouts = await LayoutManager.getAll();
    const selected = allLayouts.find((layout) => layout.id === selectedId);
    if (selectedId === "") {
      await showHUD("The selected layout is empty, please setting the correct id.");
    }
    try {
      if (selected) {
        await selected.activate();
      } else {
        await showHUD(`Failed select ${selectedId}, please setting the correct id.`);
      }
    } catch (e) {
      console.log("error: ", e);
    }
    return selected;
  }
};
