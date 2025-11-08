import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { gunzipSync } from "node:zlib";
import { environment, getPreferenceValues } from "@raycast/api";
import AdmZip from "adm-zip";

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
      url: "https://github.com/blueset/uni/releases/download/pre-91ed07f/uni-91ed07f-darwin-amd64.gz",
      sha256:
        "sha256:6231fe742b7b43fec7802f4afb33a0a3520ae3714e5d1fc17c86c9edb3042ea3",
    },
    arm64: {
      url: "https://github.com/blueset/uni/releases/download/pre-91ed07f/uni-91ed07f-darwin-arm64.gz",
      sha256:
        "sha256:7e281442878a1bea76b4941027599a8db29912518cec6e332b005e996393470c",
    },
  },
  win32: {
    x64: {
      url: "https://github.com/blueset/uni/releases/download/pre-91ed07f/uni-91ed07f-windows-amd64.exe.gz",
      sha256:
        "sha256:ff7ee30d3b577b958ac6ddcdc81d40ffa5aa1793ce71c5f605e8e0403e5f8294",
    },
    arm64: {
      url: "https://github.com/blueset/uni/releases/download/pre-91ed07f/uni-91ed07f-windows-arm64.exe.gz",
      sha256:
        "sha256:c03ce96d2b0e53a6e0f537dad08c3e849674887b525610933a419564f5bfc9fe",
    },
  },
  nodeDarwin: {
    x64: {
      url: "https://github.com/blueset/uni/releases/download/pre-91ed07f/uni-node-91ed07f-darwin-x64.zip",
      sha256:
        "sha256:bbebb5a0fd235349e1a9e038b46ef0a0a1f143ee819002bc8e26cf0b3b1d389e",
    },
    arm64: {
      url: "https://github.com/blueset/uni/releases/download/pre-91ed07f/uni-node-91ed07f-darwin-arm64.zip",
      sha256:
        "sha256:3dfa2e2e00ff5b62c30b8f929ad24c4b82b1ec0cd4638f54f0c23242aa1c9972",
    },
  },
  nodeWin32: {
    x64: {
      url: "https://github.com/blueset/uni/releases/download/pre-91ed07f/uni-node-91ed07f-windows-x64.zip",
      sha256:
        "sha256:274eaf5e4fb2f3cf61280295040855f496af3047ca8e361c0e37cca8e433d377",
    },
  },
  js: {
    wasm: {
      url: "https://github.com/blueset/uni/releases/download/pre-91ed07f/uni-91ed07f-wasm.wasm.gz",
      sha256:
        "sha256:73f57212f6a71be21efd5467905374340cb222fac56fc6f2b98d636d73247711",
    },
  },
};

export type BinaryInfo =
  | {
      execSource: "wasm";
      wasmBinary: Buffer<ArrayBufferLike>;
    }
  | {
      execSource: "bundled" | "path" | "custom" | "node";
      execPath: string;
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
    const preferences = getPreferenceValues<Preferences>();
    let execSource = preferences.execSource;

    const platform =
      execSource === "node"
        ? `node${os.platform().charAt(0).toUpperCase()}${os.platform().slice(1)}`
        : os.platform();
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

    if (execSource === "node") {
      binaryInfo = BINARIES[platform][arch];
      filename = path.basename(binaryInfo.url).replace(/\.zip$/, ".node");
    } else if (execSource === "bundled") {
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
      console.log(`Checking existence of binary at ${targetPath}`);
      await fs.access(targetPath);
      // File exists, skip download
    } catch {
      // File doesn't exist, download it
      // 3. Download
      const response = await fetch(binaryInfo.url);
      if (!response.ok) {
        throw new Error(`Failed to download binary: ${response.statusText}`);
      }
      const downloadBuffer = Buffer.from(await response.arrayBuffer());

      // Check SHA256
      const hash = crypto.createHash("sha256");
      hash.update(downloadBuffer);
      const calculatedHash = `sha256:${hash.digest("hex")}`;

      if (calculatedHash !== binaryInfo.sha256) {
        throw new Error(
          `SHA256 mismatch: expected ${binaryInfo.sha256}, got ${calculatedHash}`,
        );
      }

      if (execSource === "node") {
        // Load zip archive
        const zip = new AdmZip(downloadBuffer);
        const zipEntries = zip.getEntries();

        // Ensure support directory exists
        await fs.mkdir(environment.supportPath, { recursive: true });

        // Extract each file
        for (const entry of zipEntries) {
          if (entry.isDirectory) continue;

          const entryBasename = path.basename(entry.entryName);
          const extractPath =
            entryBasename === "@eana+uni.node"
              ? targetPath
              : path.join(environment.supportPath, entryBasename);
          await fs.writeFile(extractPath, entry.getData());
        }
      } else {
        // Decompress and write
        const decompressed = gunzipSync(downloadBuffer);

        // Ensure support directory exists
        await fs.mkdir(environment.supportPath, { recursive: true });
        await fs.writeFile(targetPath, decompressed);

        // Set executable permissions (for bundled binaries)
        if (execSource === "bundled") {
          await fs.chmod(targetPath, 0o755);
        }
      }
    }

    // 4. Return
    if (execSource === "node") {
      return {
        execSource: "node",
        execPath: targetPath,
      };
    } else if (execSource === "bundled") {
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
