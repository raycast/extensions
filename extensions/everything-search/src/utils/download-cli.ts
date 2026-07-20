import { showToast, Toast } from "@raycast/api";
import { createHash } from "crypto";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import https from "https";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { execAsync } from "./command";

const ES_GITHUB_API_URL = "https://api.github.com/repos/voidtools/ES/releases/latest";

// Map process.arch to the asset name suffix used in ES CLI GitHub releases
const ARCH_ASSET_SUFFIX: Record<string, string> = {
  x64: ".x64.zip",
  arm64: ".ARM64.zip",
};

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  digest: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubReleaseAsset[];
}

function getInstallDir(): string {
  const localAppData =
    process.env.LOCALAPPDATA ||
    (process.env.USERPROFILE ? join(process.env.USERPROFILE, "AppData", "Local") : null) ||
    join(homedir(), "AppData", "Local");

  return join(localAppData, "Microsoft", "WindowsApps");
}

function httpsDownload(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "everything-raycast-extension" } }, (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          resolve(httpsDownload(res.headers.location));
          return;
        }
        if (status < 200 || status >= 300) {
          reject(new Error(`HTTP ${status} from ${url}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

/**
 * Downloads the latest ES CLI release from GitHub, validates its SHA-256 hash
 * against the digest provided by the GitHub API, and installs es.exe to
 * %LOCALAPPDATA%\Microsoft\WindowsApps.
 *
 * Returns the installed path on success, or null on failure.
 */
export async function downloadCli(): Promise<string | null> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Downloading ES CLI",
    message: "Fetching latest release info\u2026",
  });

  try {
    const assetSuffix = ARCH_ASSET_SUFFIX[process.arch];
    if (!assetSuffix) {
      throw new Error(`Unsupported architecture: ${process.arch}`);
    }

    const releaseBuffer = await httpsDownload(ES_GITHUB_API_URL);
    const release: GitHubRelease = JSON.parse(releaseBuffer.toString());

    const asset = release.assets.find((a) => a.name.toLowerCase().endsWith(assetSuffix.toLowerCase()));
    if (!asset) {
      throw new Error(`No ES CLI release asset found for ${process.arch}`);
    }

    if (!asset.digest?.startsWith("sha256:")) {
      throw new Error(`Missing or unsupported digest format for ${asset.name}`);
    }
    const expectedHash = asset.digest.slice("sha256:".length);

    toast.message = `Downloading ${asset.name}\u2026`;
    const zipBuffer = await httpsDownload(asset.browser_download_url);

    toast.message = "Verifying integrity\u2026";
    const actualHash = createHash("sha256").update(zipBuffer).digest("hex");
    if (actualHash !== expectedHash) {
      throw new Error(
        `Hash mismatch for ${asset.name}:\n` + `  expected: ${expectedHash}\n` + `  actual:   ${actualHash}`,
      );
    }

    toast.message = "Extracting es.exe\u2026";
    const installDir = await getInstallDir();
    const tempDir = join(tmpdir(), `es-cli-${Date.now()}`);
    const tempZip = join(tempDir, asset.name);

    try {
      mkdirSync(tempDir, { recursive: true });
      writeFileSync(tempZip, zipBuffer);

      await execAsync(
        `powershell -NoProfile -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempDir}' -Force"`,
      );

      const esExeSrc = join(tempDir, "es.exe");
      if (!existsSync(esExeSrc)) {
        throw new Error("es.exe not found in downloaded archive");
      }
      mkdirSync(installDir, { recursive: true });
      const esExeDest = join(installDir, "es.exe");
      copyFileSync(esExeSrc, esExeDest);

      await showToast({
        style: Toast.Style.Success,
        title: "ES CLI Installed",
        message: `v${release.tag_name} installed to ${esExeDest}`,
      });

      return esExeDest;
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Error downloading ES CLI:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Download ES CLI",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
