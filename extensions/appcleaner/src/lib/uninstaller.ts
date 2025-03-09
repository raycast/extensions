import type { Application } from "@raycast/api";
import type { UninstallerApp } from "./types";

import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { exec } from "child_process";
import { pathExists } from "./utils";

export const UNINSTALLERS = [
  {
    id: "appcleaner",
    name: "AppCleaner",
    path: "/Applications/AppCleaner.app",
    url: "https://freemacsoft.net/appcleaner/",
    icon: "icon.png",
  },
  {
    id: "pearcleaner",
    name: "Pearcleaner",
    path: "/Applications/PearCleaner.app",
    url: "https://itsalin.com/appInfo/?id=pearcleaner",
    icon: "pearcleaner.png",
  },
  {
    id: "trashme",
    name: "TrashMe 3",
    path: "/Applications/TrashMe 3.app",
    url: "https://www.jibapps.com/apps/trashme3/",
    icon: "trashme.png",
  },
];

export class Uninstaller {
  /**
   * Find an uninstaller app. (try the preferred first, and if not found, try the others)
   * @returns The uninstaller app or undefined if none is found.
   */
  static async getUninstaller(): Promise<UninstallerApp | undefined> {
    const preferred = getPreferenceValues<Preferences>().uninstaller_app;
    const uninstallers = Array.from(UNINSTALLERS);

    if (preferred) {
      // sort uninstallers so that the preferred is first
      uninstallers.sort((a, b) => (a.id === preferred ? -1 : b.id === preferred ? 1 : 0));
    }

    // return the first one that exists
    for (const uninstaller of uninstallers) {
      if (await pathExists(uninstaller.path)) return uninstaller;
    }

    return undefined;
  }

  /**
   * Checks if an uninstaller app is available.
   * @returns A promise that resolves if an uninstaller app is found, otherwise it rejects.
   */
  static checkDependencies(): Promise<void> {
    return Uninstaller.getUninstaller().then((uninstaller) => {
      if (!uninstaller) throw new Error("No uninstaller app found.");
      updateCommandMetadata({ subtitle: "with " + uninstaller.name });
    });
  }

  /**
   * Launch the uninstaller app for the given app.
   * @param app The app to uninstall.
   * @returns A promise that resolves when the uninstaller app is launched.
   */
  static async launch(app: Application): Promise<void> {
    const uninstaller = await Uninstaller.getUninstaller();
    if (!uninstaller) return Promise.reject(new Error("No uninstaller app found."));

    return new Promise((resolve, reject) => {
      exec(`open -a "${uninstaller.path}" "${app.path}"`, (error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }
}
