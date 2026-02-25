/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const { execSync } = require("child_process");

// Only win32_x64 and win32_arm64 are supported — 32-bit (win32_ia32) is not supported.
const koffiTargets = ["win32_x64", "win32_arm64"];

// Mapping of architecture to a .dll file in Everything SDK.
// NOTE: An arm64 Everything DLL is only available in Everything 1.5 alpha.
const everythingDllTargets = {
  x64: { file: "Everything64.dll", sha256: "c7ab8b47f7dd4c41aa735f4ba40b35ad5460a86fa7abe0c94383f12bce33bfb6" },
  arm64: null
};

const EVERYTHING_SDK_ZIP_URL = "https://www.voidtools.com/Everything-SDK.zip";

const root = path.resolve(__dirname, "..");
const assetsDir = path.join(root, "assets");
const nativeAssetsDir = path.join(assetsDir, "native");
const koffiAssetsDir = path.join(nativeAssetsDir, "koffi");
const koffiModulesDir = path.join(root, "node_modules", "koffi", "build", "koffi");

/**
 * Downloads a file from the given URL, following redirects.
 * Returns a Buffer with the file contents.
 */
function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const status = response.statusCode || 0;

        if (status >= 300 && status < 400 && response.headers.location) {
          resolve(download(response.headers.location));
          return;
        }

        if (status < 200 || status >= 300) {
          reject(new Error(`Failed to download ${url}. HTTP ${status}`));
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

/**
 * Copies koffi.node prebuilt binaries from node_modules into assets/native/koffi.
 */
function copyKoffiBindings() {
  if (!fs.existsSync(path.join(root, "node_modules"))) {
    console.error("Error: node_modules not found. Please run `npm install` first, then re-run this script.");
    process.exit(1);
  }

  if (!fs.existsSync(koffiModulesDir)) {
    console.error("Error: koffi build directory not found at node_modules/koffi/build/koffi.");
    console.error("Run `npm install` to ensure koffi is installed, then re-run this script.");
    process.exit(1);
  }

  for (const target of koffiTargets) {
    const src = path.join(koffiModulesDir, target, "koffi.node");
    const destDir = path.join(koffiAssetsDir, target);
    const dest = path.join(destDir, "koffi.node");

    if (!fs.existsSync(src)) {
      console.warn(`  Warning: ${path.relative(root, src)} not found, skipping.`);
      continue;
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`  Copied koffi.node → ${path.relative(root, dest)}`);
  }
}

/**
 * Downloads the Everything SDK zip and extracts the DLLs defined in everythingDllTargets
 * into the assets/ directory, saved as Everything_${arch}.dll.
 */
async function fetchEverythingDlls() {
  console.log(`Downloading Everything SDK from ${EVERYTHING_SDK_ZIP_URL}...`);
  const zipBuffer = await download(EVERYTHING_SDK_ZIP_URL);

  // Write zip to a temp file, extract with PowerShell, then clean up
  const tempZip = path.join(root, "_everything-sdk-tmp.zip");
  const tempExtract = path.join(root, "_everything-sdk-tmp");

  try {
    fs.writeFileSync(tempZip, zipBuffer);
    fs.mkdirSync(tempExtract, { recursive: true });

    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempExtract}' -Force"`,
      { stdio: "pipe" },
    );

    for (const [arch, target] of Object.entries(everythingDllTargets)) {
      if (!target) {
        continue;
      }

      const { file: sourceDll, sha256: expectedHash } = target;
      const src = path.join(tempExtract, "dll", sourceDll);
      const destName = `Everything_${arch}.dll`;
      const dest = path.join(nativeAssetsDir, destName);

      if (!fs.existsSync(src)) {
        console.warn(`  Warning: dll/${sourceDll} not found in SDK zip, skipping ${arch}.`);
        continue;
      }

      // Validate SHA-256 hash before copying
      const fileBuffer = fs.readFileSync(src);
      const actualHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      if (actualHash !== expectedHash) {
        throw new Error(
          `Hash mismatch for ${sourceDll} (${arch}):\n` +
            `  expected: ${expectedHash}\n` +
            `  actual:   ${actualHash}`,
        );
      }

      console.log(`  Hash verified for ${sourceDll} (${arch})`);
      fs.copyFileSync(src, dest);
      console.log(`  Saved ${path.relative(root, dest)}`);
    }
  } finally {
    // Clean up temp files
    fs.rmSync(tempZip, { force: true });
    fs.rmSync(tempExtract, { recursive: true, force: true });
  }
}

async function run() {
  console.log("=== Copying koffi.node bindings ===");
  copyKoffiBindings();

  console.log("\n=== Fetching Everything SDK DLLs ===");
  await fetchEverythingDlls();

  console.log("\nDone. Native binaries are up to date.");
}

run().catch((error) => {
  console.error("Failed to fetch native binaries.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
