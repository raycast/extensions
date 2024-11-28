import { exec as Exec } from "child_process";
import { promisify } from "util";

import { ILayout, ILayoutManager } from "./interfaces";

const exec = promisify(Exec);
const karabinerCliPath = "'/Library/Application Support/org.pqrs/Karabiner-Elements/bin/karabiner_cli'";

export async function isKarabinerCliAvailable(): Promise<boolean> {
  try {
    await exec(`/bin/test -f ${karabinerCliPath}`);
    return true;
  } catch (e) {
    return false;
  }
}

export const KarabinerManager: ILayoutManager = class KarabinerProfile implements ILayout {
  static activeInput?: string;

  private constructor(
    readonly id: string,
    readonly title: string,
  ) {}

  get active(): boolean {
    return this.title === KarabinerManager.activeInput;
  }

  public async activate(): Promise<void> {
    const result = await exec(`${karabinerCliPath} --select-profile '${this.id}'`);
    const status = result.stdout.split("\n")[0];
    if (status.startsWith("[error]")) {
      throw new Error(`Karabiner Profile "${this.title}" not found`);
    } else {
      return;
    }
  }

  static async getAll() {
    // Fetch data
    const [inputsResult, activeResult] = await Promise.all([
      exec(`${karabinerCliPath} --list-profile-names`),
      exec(`${karabinerCliPath} --show-current-profile-name`),
    ]);

    // Set active source
    KarabinerManager.activeInput = activeResult.stdout.split("\n")[0];

    // Create instances
    const profileNames = inputsResult.stdout.split("\n");
    const sources: Array<ILayout> = [];
    for (const profileName of profileNames) {
      if (profileName.length === 0) continue;
      sources.push(new KarabinerProfile(profileName, profileName));
    }
    return sources;
  }
};
