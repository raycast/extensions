import { exec as Exec } from "child_process";
import { promisify } from "util";
import { environment } from "@raycast/api";
import { ILayout, ILayoutManager } from "./interfaces";

const exec = promisify(Exec);

const setPermissions = async () => {
  return exec(`/bin/chmod u+x ${environment.assetsPath}/keyboardSwitcher`);
};

const fetchData = async (): Promise<{ stdout: string; stderr: string }[]> => {
  return await Promise.all([
    exec(`${environment.assetsPath}/keyboardSwitcher json`),
    exec(`${environment.assetsPath}/keyboardSwitcher get`),
  ]);
};

export class Layout implements ILayout {
  static activeInput?: string;

  constructor(
    public readonly id: string,
    public readonly title: string,
  ) {}

  get active(): boolean {
    return this.title === Layout.activeInput;
  }

  public async activate(): Promise<void> {
    const result = await exec(`${environment.assetsPath}/keyboardSwitcher select "${this.id}"`);
    const status = result.stdout.split("\n")[1];
    if (status === "found") {
      return;
    } else {
      throw new Error(`Layout "${this.title}" Not Found`);
    }
  }
}

export const LayoutManager: ILayoutManager = class {
  static async getAll(): Promise<ILayout[]> {
    await setPermissions();

    // Fetch data
    const [inputsResult, activeResult] = await fetchData();

    // Set active source
    Layout.activeInput = activeResult.stdout.split("\n")[0];

    // Create instances
    const rawSources = JSON.parse(inputsResult.stdout);
    const sources: Array<ILayout> = [];
    for (const obj of rawSources) {
      sources.push(new Layout(obj.arg, obj.title));
    }
    return sources.sort((a, b) => a.title.localeCompare(b.title));
  }

  static async setNextInput(): Promise<ILayout> {
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

  static async setLayoutByTitle(title: string): Promise<void> {
    const allLayouts = await LayoutManager.getAll();
    const layout = allLayouts.find((layout) => layout.title === title);
    if (layout) {
      await layout.activate();
    } else {
      throw new Error(`Layout "${title}" Not Found`);
    }
  }
};
