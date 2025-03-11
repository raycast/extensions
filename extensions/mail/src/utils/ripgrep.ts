// adapted from https://github.com/lvce-editor/ripgrep/blob/main/src/downloadRipGrep.js
import { environment } from "@raycast/api";
import { execa } from "execa";
import got from "got";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import * as os from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";

const REPOSITORY = `microsoft/ripgrep-prebuilt`;
const VERSION = "v13.0.0-10";
const BIN_PATH = join(environment.supportPath, "bin");

const getTarget = () => {
  const arch = os.arch();
  const platform = os.platform();
  switch (platform) {
    case "darwin":
      switch (arch) {
        case "arm64":
          return "aarch64-apple-darwin.tar.gz";
        default:
          return "x86_64-apple-darwin.tar.gz";
      }
    default:
      throw new Error("Unknown platform: " + platform);
  }
};

export const downloadFile = async (url: string, outFile: string) => {
  try {
    await mkdir(dirname(outFile), { recursive: true });
    await pipeline(got.stream(url), createWriteStream(outFile));
  } catch (error) {
    throw new Error(`Failed to download "${url}"`);
  }
};

const untarGz = async (inFile: string, outDir: string) => {
  try {
    await mkdir(outDir, { recursive: true });
    await execa("tar", ["xf", inFile, "-C", outDir]);
  } catch (error) {
    throw new Error(`Failed to extract "${inFile}"`);
  }
};

export const ensureCLI = async () => {
  const rgPath = join(BIN_PATH, "rg");

  if (existsSync(rgPath)) {
    return rgPath;
  } else {
    const target = getTarget();
    const url = `https://github.com/${REPOSITORY}/releases/download/${VERSION}/ripgrep-${VERSION}-${target}`;
    const filePath = join(environment.supportPath, ".tmp", `ripgrep-${VERSION}-${target}`);
    await downloadFile(url, filePath);
    await untarGz(filePath, BIN_PATH);
    return rgPath;
  }
};
