import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { gunzipSync } from "node:zlib";
import { environment, getPreferenceValues } from "@raycast/api";
import type { PreferenceValues } from "./types";

const BINARIES: Record<
  string,
  Record<
    string,
    {
      url: string;
      sha256: string;
    }
  >
> = {
  darwin: {
    x64: {
      url: "https://github.com/blueset/uni/releases/download/pre-eb04126/uni-eb04126-darwin-amd64.gz",
      sha256:
        "sha256:320153f706447dc446f2e22515e896afb8a011f8feb28bda9a3495766f82dad4",
    },
    arm64: {
      url: "https://github.com/blueset/uni/releases/download/pre-eb04126/uni-eb04126-darwin-arm64.gz",
      sha256:
        "sha256:a58100522adef96a06a3e14d697ad3dfab7d7c59456c6909271b5ab3504d2e1f",
    },
  },
  win32: {
    x64: {
      url: "https://github.com/blueset/uni/releases/download/pre-eb04126/uni-eb04126-windows-amd64.exe.gz",
      sha256:
        "sha256:a5dde329675915678186d4b49a148b86443c6cb76b68d39a8a88e817f5fb7b4e",
    },
    arm64: {
      url: "https://github.com/blueset/uni/releases/download/pre-eb04126/uni-eb04126-windows-arm64.exe.gz",
      sha256:
        "sha256:db98e7339e7940886294b33136f9b1406df49223356d743b98d7a3e51f29d1ee",
    },
  },
  js: {
    wasm: {
      url: "https://github.com/blueset/uni/releases/download/pre-eb04126/uni-eb04126-wasm.wasm.gz",
      sha256:
        "sha256:5084a6cbebe223804108038c0c62485a8ada4e7935ae6ebb92c50798d7145dc3",
    },
  },
};

export type BinaryInfo =
  | {
      execSource: "wasm";
      execPath: undefined;
      wasmBinary: Buffer<ArrayBufferLike>;
    }
  | {
      execSource: "bundled" | "path" | "custom";
      execPath: string;
      wasmBinary: undefined;
    };

// Mutex lock for ensuring single execution
let ensureBinaryPromise: Promise<BinaryInfo> | null = null;

export async function ensureBinaryAvailable(): Promise<BinaryInfo> {
  // 0. Ensure this function runs on a mutex lock
  if (ensureBinaryPromise) {
    return ensureBinaryPromise;
  }

  ensureBinaryPromise = (async () => {
    // 1. Decide execSource
    const preferences = getPreferenceValues<PreferenceValues>();
    let execSource = preferences.execSource;

    const platform = os.platform();
    const arch = os.arch();

    // If execSource is bundled and platform+arch not in binaries, change to wasm
    if (execSource === "bundled" && !BINARIES[platform]?.[arch]) {
      console.warn(
        `No bundled binary available for platform ${platform} and architecture ${arch}, falling back to WASM`,
      );
      execSource = "wasm";
    }

    // If execSource is path, return early
    if (execSource === "path") {
      return {
        execSource: "path",
        execPath: "uni",
      };
    }

    // If execSource is custom, return early
    if (execSource === "custom") {
      return {
        execSource: "custom",
        execPath: preferences.execPath,
      };
    }

    // 2 & 3. Check if binary exists, or download
    let binaryInfo: { url: string; sha256: string };
    let filename: string;

    if (execSource === "bundled") {
      binaryInfo = BINARIES[platform][arch];
      filename = path.basename(binaryInfo.url).replace(/\.gz$/, "");
    } else {
      // execSource === "wasm"
      binaryInfo = BINARIES.js.wasm;
      filename = path.basename(binaryInfo.url).replace(/\.gz$/, "");
    }

    const targetPath = path.join(environment.supportPath, filename);

    // 2. Check if the binary already exists
    try {
      await fs.access(targetPath);
      // File exists, skip download
    } catch {
      // File doesn't exist, download it
      // 3. Download
      const response = await fetch(binaryInfo.url);
      if (!response.ok) {
        throw new Error(`Failed to download binary: ${response.statusText}`);
      }

      const gzBuffer = Buffer.from(await response.arrayBuffer());

      // Check SHA256
      const hash = crypto.createHash("sha256");
      hash.update(gzBuffer);
      const calculatedHash = `sha256:${hash.digest("hex")}`;

      if (calculatedHash !== binaryInfo.sha256) {
        throw new Error(
          `SHA256 mismatch: expected ${binaryInfo.sha256}, got ${calculatedHash}`,
        );
      }

      // Decompress and write
      const decompressed = gunzipSync(gzBuffer);

      // Ensure support directory exists
      await fs.mkdir(environment.supportPath, { recursive: true });
      await fs.writeFile(targetPath, decompressed);

      // Set executable permissions (for bundled binaries)
      if (execSource === "bundled") {
        await fs.chmod(targetPath, 0o755);
      }
    }

    // 4. Return
    if (execSource === "bundled") {
      return {
        execSource: "bundled",
        execPath: targetPath,
      };
    } else {
      // execSource === "wasm"
      const wasmBinary = await fs.readFile(targetPath);
      return {
        execSource: "wasm",
        wasmBinary,
      };
    }
  })();

  try {
    return await ensureBinaryPromise;
  } finally {
    // Reset the promise after completion or error
    ensureBinaryPromise = null;
  }
}
