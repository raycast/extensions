import https from "https";
import fs from "fs";
import AdmZip from "adm-zip";
import { rm } from "fs/promises";
import { resolve } from "path";
import { showToast, Toast, environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CACHE_DIR, ZIP_URL } from "./constants";

export async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            downloadFile(redirectUrl, dest).then(resolvePromise).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(dest);
        response.pipe(file);

        file.on("finish", () => {
          file.close((err) => {
            if (err) reject(err);
            else resolvePromise();
          });
        });

        file.on("error", (err) => {
          file.close();
          fs.unlink(dest, () => reject(err));
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

export async function refreshPages() {
  await rm(CACHE_DIR, { recursive: true, force: true });
  await showToast(Toast.Style.Animated, "Fetching TLDR Pages...");

  const tempZipPath = resolve(environment.supportPath, "tldr-main.zip");
  const tempExtractPath = resolve(environment.supportPath, "tldr-temp");

  try {
    await downloadFile(ZIP_URL, tempZipPath);

    if (!fs.existsSync(tempZipPath)) {
      throw new Error("Downloaded file does not exist");
    }

    const stats = await fs.promises.stat(tempZipPath);
    if (stats.size === 0) {
      throw new Error("Downloaded file is empty");
    }

    await fs.promises.mkdir(tempExtractPath, { recursive: true });
    try {
      // Use a JS-based unzip to be cross-platform (works on Windows/macOS/Linux)
      const zip = new AdmZip(tempZipPath);
      zip.extractAllTo(tempExtractPath, true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to extract archive: ${message}`);
    }

    const pagesPath = resolve(tempExtractPath, "tldr-main", "pages");
    await fs.promises.rename(pagesPath, CACHE_DIR);
    await showToast(Toast.Style.Success, "TLDR pages fetched!");
  } catch (error) {
    await showFailureToast(error, { title: "Download Failed" });
  } finally {
    await rm(tempZipPath, { force: true });
    await rm(tempExtractPath, { recursive: true, force: true });
  }
}
