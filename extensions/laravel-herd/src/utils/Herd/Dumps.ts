import { Herd } from "../Herd";

export class Dumps {
  static async open(): Promise<void> {
    await Herd.runAppleScript<void>(`dumps open`);
  }

  static async toggleIntercept() {
    await Herd.runAppleScript<void>(`dumps toggle intercept`);
  }

  static async isInterceptingDumps(): Promise<boolean> {
    return await Herd.runAppleScript<boolean>(`config value "dumps"`);
  }

  static async isPinned(): Promise<boolean> {
    return await Herd.runAppleScript<boolean>(`appstate value "keepDumpsOnTop"`);
  }

  static async clear(): Promise<boolean> {
    await Herd.runAppleScript<boolean>(`dumps clear`);
    return true;
  }

  static async togglePin(): Promise<void> {
    await Herd.runAppleScript<void>(`dumps toggle pin`);
  }
}
