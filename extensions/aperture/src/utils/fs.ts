import { getPreferenceValues } from "@raycast/api";
import { format } from "date-fns";
import { statSync } from "fs";
import { rename } from "fs/promises";
import { join } from "path";
import { getRandomString } from "~/utils/crypto";
import os from "os";

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
  const savedFilePath = join(savePath, `Aperture ${format(endTime, "yyyy-MM-dd 'at' HH.mm.ss")}.mp4`);
  await rename(filePath, savedFilePath);

  return savedFilePath;
}

export function getTemporaryFilePath({ extension }: { extension: "mp4" | "jpg" }) {
  return join(os.tmpdir(), `aperture-tmp-${getRandomString()}.${extension}`);
}
