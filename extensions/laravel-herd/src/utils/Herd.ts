import { runAppleScript, showFailureToast } from "@raycast/utils";
import { Dumps } from "./Herd/Dumps";
import { Mails } from "./Herd/Mails";
import { Sites } from "./Herd/Sites";
import { Services } from "./Herd/Services";
import { PHP } from "./Herd/PHP";
import { Node } from "./Herd/Node";
import { ExternalApps } from "./Herd/ExternalApps";
import { closeMainWindow, environment, LaunchType } from "@raycast/api";
import { General } from "./Herd/General";

export class Herd {
  static async runAppleScript<T extends boolean | string | number | void>(
    script: string,
    forceType?: "boolean" | "string" | "number",
    timeout: number = 0,
  ): Promise<T> {
    if ((await this.ensureHerdIsInstalled()) === false) {
      return undefined as T;
    }

    const result = await runAppleScript(this.getAppleScript(script), { timeout });

    if (result === "") {
      return undefined as T;
    }

    const convertedResult = Herd.convertAppleScriptResult<T>(result, forceType);

    return convertedResult;
  }

  static convertAppleScriptResult<T extends boolean | string | number | void>(
    result: string,
    forceType?: "boolean" | "string" | "number",
  ): T {
    if (forceType) {
      return this.convertToType(result, forceType) as T;
    }

    return this.autoDetectType(result) as T;
  }

  private static convertToType(
    result: string,
    type: "boolean" | "string" | "number",
  ): boolean | string | number | void {
    if (!result || result === "undefined" || result === "null") {
      return undefined;
    }

    switch (type) {
      case "boolean":
        return result.toLowerCase() === "true";
      case "number":
        return Number(result);
      case "string":
        return result;
    }
  }

  private static autoDetectType(result: string): boolean | string | number | void {
    if (!result || result === "undefined" || result === "null") {
      return undefined;
    }

    if (result.toLowerCase() === "true") return true;
    if (result.toLowerCase() === "false") return false;

    const num = Number(result);
    if (!isNaN(num)) return num;

    return result;
  }

  static get Mails() {
    return Mails;
  }

  static get Dumps() {
    return Dumps;
  }

  static get Sites() {
    return Sites;
  }

  static get Services() {
    return Services;
  }

  static get PHP() {
    return PHP;
  }

  static get Node() {
    return Node;
  }

  static get ExternalApps() {
    return ExternalApps;
  }

  static get General() {
    return General;
  }

  private static async ensureHerdIsInstalled(): Promise<boolean> {
    if ((await Herd.ExternalApps.isInstalled("Herd")) === false) {
      await closeMainWindow();
      if (environment.launchType !== LaunchType.Background) {
        showFailureToast("", { title: "Laravel Herd is not installed." });
      }

      return false;
    }

    return true;
  }

  private static getAppleScript(script: string): string {
    return `
    if application "Herd" is running then
        tell application "Herd"
            ${script}
        end tell
    end if
    `;
  }
}
