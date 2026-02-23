import { environment, showToast, Toast } from "@raycast/api";
import path from "path";
import fs from "fs";
import afs from "fs/promises";
import { createHash } from "crypto";
import { createReadStream } from "fs";

const CLI_VERSION = "1.4.1";

interface CliPlatformInfo {
  filename: string;
  sha256: string;
}

const CLI_PLATFORMS: Record<string, CliPlatformInfo> = {
  "darwin-arm64": {
    filename: "pass-cli-macos-aarch64",
    sha256: "7019050f490d8289c045eca39a6abf3fd480f6bcc3fa7807831241b4ec13d7f1",
  },
  "darwin-x64": {
    filename: "pass-cli-macos-x86_64",
    sha256: "ceffa547d14af8ea5acf0963f11ef0d60ee0bd37fd7ed34a4c70ef86d82ad035",
  },
};

function getPlatformKey(): string {
  const platform = process.platform;
  const arch = process.arch;
  return `${platform}-${arch}`;
}

export function passCliDirectory(): string {
  return path.join(environment.supportPath, "cli");
}

export function passCliFilepath(): string {
  return path.join(passCliDirectory(), "pass-cli");
}

export function isCliInstalled(): boolean {
  return fs.existsSync(passCliFilepath());
}

export async function ensureCli(): Promise<string> {
  const cli = passCliFilepath();

  if (fs.existsSync(cli)) {
    console.log("pass-cli already installed at:", cli);
    return cli;
  }

  const installToast = await showToast({
    style: Toast.Style.Animated,
    title: "Installing Proton Pass CLI",
    message: "Downloading binary...",
  });

  const platformKey = getPlatformKey();
  const platformInfo = CLI_PLATFORMS[platformKey];

  if (!platformInfo) {
    throw new Error(
      `Unsupported platform: ${platformKey}. Supported platforms: ${Object.keys(CLI_PLATFORMS).join(", ")}`,
    );
  }

  const binaryUrl = `https://proton.me/download/pass-cli/${CLI_VERSION}/${platformInfo.filename}`;
  const dir = passCliDirectory();
  const tempDir = path.join(environment.supportPath, ".tmp");

  console.log(`Downloading pass-cli from: ${binaryUrl}`);

  const downloadedFile = path.join(tempDir, "pass-cli");

  try {
    await afs.mkdir(tempDir, { recursive: true });
    const response = await fetch(binaryUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await afs.writeFile(downloadedFile, buffer);
    installToast.message = "Download complete. Verifying binary...";
  } catch (error) {
    installToast.style = Toast.Style.Failure;
    installToast.title = "Failed to Install Proton Pass CLI";
    installToast.message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not download pass-cli: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const fileHash = await new Promise<string>((resolve, reject) => {
      const hash = createHash("sha256");
      const stream = createReadStream(downloadedFile);
      stream.on("data", (data) => hash.update(data));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", reject);
    });
    console.log(`Downloaded file hash: ${fileHash}`);
    console.log(`Expected hash: ${platformInfo.sha256}`);

    if (fileHash !== platformInfo.sha256) {
      throw new Error(`SHA256 hash mismatch. Expected: ${platformInfo.sha256}, Got: ${fileHash}`);
    }

    installToast.message = "Installing binary...";
    await afs.mkdir(dir, { recursive: true });
    await afs.copyFile(downloadedFile, cli);
  } catch (error) {
    installToast.style = Toast.Style.Failure;
    installToast.title = "Failed to Install Proton Pass CLI";
    installToast.message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not verify pass-cli: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    try {
      await afs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  try {
    await afs.chmod(cli, "755");
  } catch (error) {
    try {
      await afs.rm(cli);
    } catch {
      // Ignore cleanup errors
    }
    installToast.style = Toast.Style.Failure;
    installToast.title = "Failed to Install Proton Pass CLI";
    installToast.message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not set permissions on pass-cli: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("pass-cli installed successfully at:", cli);
  installToast.style = Toast.Style.Success;
  installToast.title = "Proton Pass CLI Ready";
  installToast.message = "Download and installation complete.";
  return cli;
}

export async function clearCliCache(): Promise<void> {
  try {
    const dir = passCliDirectory();
    await afs.rm(dir, { recursive: true });
  } catch {
    // Ignore errors if directory doesn't exist
  }
}
