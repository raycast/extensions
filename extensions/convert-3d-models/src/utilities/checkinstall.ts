/**
 * @file utilities/checkinstall.ts
 *
 * @summary FreeCAD Installation checker
 * @author Felix Jen <felix@fjlaboratories.com>
 *
 * Created at     : 2024-01-12 17:00:00
 * Last modified  : 2024-01-12 17:00:00
 */

import { getApplications, showToast, Toast, open } from "@raycast/api";
async function isFreeCADInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "org.freecadweb.FreeCAD");
}

export async function checkFreeCADInstallation(): Promise<boolean> {
  const isInstalled = await isFreeCADInstalled();
  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "FreeCAD is not installed.",
      message: "Install it from: https://www.freecad.org/downloads.php",
      primaryAction: {
        title: "Go to https://www.freecad.org/downloads.php",
        onAction: (toast) => {
          open("https://www.freecad.org/downloads.php");
          toast.hide();
        },
      },
    };
    await showToast(options);
  }
  return isInstalled;
}
