import { environment, getPreferenceValues } from "@raycast/api";
import formatDate from "date-fns/format";
import { statSync } from "fs";
import { rename } from "fs/promises";
import { join } from "path";
import { getRandomString } from "~/utils/crypto";
import os from "os";
import { execa } from "execa";

export function waitUntilFileIsAvailable(path: string): Promise<void> {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      try {
        const stats = statSync(path);
        if (stats.isFile()) {
          clearInterval(interval);
          resolve();
        }
      } catch (e) {
        // ignore
      }
    }, 1000);
  });
}

export async function moveFileToSaveLocation(filePath: string, endTime = new Date()) {
  const savePath = getPreferenceValues<Preferences>().savePath;
  const savedFilePath = join(savePath, `Aperture ${formatDate(endTime, "yyyy-MM-dd 'at' HH.mm.ss")}.mp4`);
  await rename(filePath, savedFilePath);

  return savedFilePath;
}

export function getTemporaryFilePath({ extension }: { extension: "mp4" | "jpg" }) {
  return join(os.tmpdir(), `aperture-tmp-${getRandomString()}.${extension}`);
}

export async function openAssetsMacOSApplication(name: string) {
  const appPath = join(environment.assetsPath, `${name}.app`);
  // give execution permissions to the binary inside the app
  await execa("chmod", ["+x", join(appPath, `/Contents/MacOS/${name}`)]);
  await execa("open", [appPath]);
}
