/**
 * @file operations/convertOperation.ts
 *
 * @summary Model conversion operation with support for common 3D model formats like STEP, STL, OBJ, and others. Relies on having FreeCAD installed.
 * @author Felix Jen <felix@fjlaboratories.com>
 *
 * Created at     : 2024-01-12 17:00:00
 * Last modified  : 2024-01-12 17:00:00
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import path from "path";

import { environment, getPreferenceValues } from "@raycast/api";

import { ModelResultHandling } from "../utilities/enums";

/**
 * Converts models to the specified format, storing the results according to the user's preferences.
 *
 * @param sourcePaths The paths of the models to convert.
 * @param desiredType The desired format to convert the models to.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function convert(sourcePaths: string[], desiredType: string) {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const freeCADpath = preferences.freeCADPath?.path; // the "?" is a null check because TS thinks that this type could be undefined...

  const resultPaths = [];
  for (const item of sourcePaths) {
    const originalType = path.extname(item).slice(1);
    let newPath = path.join(path.dirname(item), path.basename(item, originalType) + desiredType.toLowerCase());

    if (preferences.modelResultHandling == ModelResultHandling.SaveToDownloads) {
      newPath = path.join(os.homedir(), "Downloads", path.basename(newPath));
    } else if (preferences.modelResultHandling == ModelResultHandling.SaveToDesktop) {
      newPath = path.join(os.homedir(), "Desktop", path.basename(newPath));
    }

    let iter = 2;
    while (fs.existsSync(newPath) && os.tmpdir() != path.dirname(newPath)) {
      newPath = path.join(
        path.dirname(newPath),
        path.basename(newPath, `.${desiredType.toLowerCase()}`) + ` (${iter})${path.extname(newPath)}`,
      );
      iter++;
    }

    execSync(`chmod +x ${environment.assetsPath}/freecad_convert.py`);

    // FreeCAD ships with its own python executable which needs to be used. Otherwise, some more advanced modules will have weird behavior.
    // https://wiki.freecad.org/Embedding_FreeCAD#Using_FreeCAD_without_GUI
    execSync(
      `"${freeCADpath}"/Contents/Resources/bin/python ${environment.assetsPath}/freecad_convert.py "${freeCADpath}/" "${item}" "${newPath}"`,
    );

    resultPaths.push(newPath);
  }
}
