import { getApplications, Icon, open } from "@raycast/api";
import { Herd } from "../Herd";
import { runAppleScript, withCache } from "@raycast/utils";
import { ExternalApp } from "../../lib/types/externalApp";
import { InstalledService } from "../../lib/types/service";

export class ExternalApps {
  static async openTinker(path: string): Promise<void> {
    await Herd.runAppleScript<boolean>(`tinker "${path}"`);
  }

  static async openTerminal(path: string): Promise<void> {
    await Herd.runAppleScript<boolean>(`terminal "${path}"`);
  }

  static async isInstalled(app: string): Promise<boolean> {
    if (app === "Adminer") {
      return true;
    }

    const cachedInstalledApplications = withCache(ExternalApps.getInstalledApplications, {
      maxAge: 5 * 60 * 1000,
    });

    const installedApplications = await cachedInstalledApplications();

    const appInstalled = installedApplications.filter((a) => a.name === app).length > 0;

    return appInstalled;
  }

  static getIcon(app: ExternalApp): Icon {
    switch (app.name) {
      case "TablePlus":
        return Icon.Coin;
      case "Adminer":
        return Icon.AppWindowList;
      default:
        return Icon.AppWindow;
    }
  }

  static async openService(app: ExternalApp, service: InstalledService): Promise<false> {
    if (app.name === "Adminer") {
      let fullUrl = "http://database.herd.test";

      if (service.type === "postgresql") {
        fullUrl += `?pgsql=127.0.0.1:${service.port}&username=root&password=`;
      } else if (service.type === "mongodb") {
        fullUrl += `?mongo&server=127.0.0.1:${service.port}`;
      } else {
        fullUrl += `?${service.type}&server=127.0.0.1:${service.port}&username=root&password=`;
      }

      open(fullUrl);
    } else if (app.name === "TablePlus") {
      await runAppleScript(`
        tell application "TablePlus"
            activate
            open location "${service.connectionURL}"
        end tell
        `);
    }

    return false;
  }

  private static async getInstalledApplications() {
    return await getApplications();
  }
}
