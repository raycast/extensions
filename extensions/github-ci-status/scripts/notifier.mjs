import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const version = "3.1.0";
const releaseUrl = `https://github.com/julienXX/terminal-notifier/releases/download/${version}/terminal-notifier-${version}.zip`;
const archiveSha256 = "e969d4ae20287da1ba55495ae31dcedd8e9069deb8ce4eed24f6561a5fc3e4d5";
const binarySha256 = "64c8f37e21b2b39491c0adeb00219a92e0ba22b56355b979d8eed2bce3d1c858";
const licenseSha256 = "9cb201db07753f2ef711be822f805d6792046aec7120ffadad0a60fb00466bf3";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const destination = join(root, "assets", "notification-helper");
const bundleName = "terminal-notifier.app";
const executable = join(destination, bundleName, "Contents", "MacOS", "terminal-notifier");

function verifyHash(data, expected, name) {
  if (createHash("sha256").update(data).digest("hex") !== expected) {
    throw new Error(`${name} checksum mismatch.`);
  }
}

async function download(url, expected) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  const data = Buffer.from(await response.arrayBuffer());
  verifyHash(data, expected, url);
  return data;
}

async function check() {
  verifyHash(await readFile(executable), binarySha256, "Bundled notification helper");
  verifyHash(await readFile(join(destination, "LICENSE.md")), licenseSha256, "Notifier license");
  await access(executable, constants.X_OK);
  // Also verifies that all signed resources survived copying/packaging.
  if (process.platform === "darwin") {
    await execute("/usr/bin/codesign", ["--verify", "--deep", "--strict", join(destination, bundleName)]);
    const { stdout } = await execute("/usr/bin/lipo", ["-archs", executable]);
    if (!stdout.includes("arm64") || !stdout.includes("x86_64")) {
      throw new Error("The notification helper must support Apple Silicon and Intel.");
    }
  }
  console.log(`Bundled notification helper ${version} verified (arm64 + x86_64).`);
}

async function setup() {
  if (process.platform !== "darwin") throw new Error("Regenerate the notification helper on macOS.");
  const temporary = await mkdtemp(join(tmpdir(), "github-ci-notifier-"));
  try {
    const archive = join(temporary, "notifier.zip");
    await writeFile(archive, await download(releaseUrl, archiveSha256));
    const extracted = join(temporary, "extracted");
    await execute("/usr/bin/ditto", ["-x", "-k", archive, extracted]);
    const license = await download(
      `https://raw.githubusercontent.com/julienXX/terminal-notifier/${version}/LICENSE.md`,
      licenseSha256,
    );
    await mkdir(destination, { recursive: true });
    await rm(join(destination, bundleName), { recursive: true, force: true });
    await cp(join(extracted, bundleName), join(destination, bundleName), { recursive: true });
    await chmod(executable, 0o755);
    await writeFile(join(destination, "LICENSE.md"), license);
    await writeFile(
      join(destination, "UPSTREAM.md"),
      `# Notification helper\n\nterminal-notifier ${version}, bundled unchanged from the official release.\n\nSource: https://github.com/julienXX/terminal-notifier/tree/${version}\n\nArchive: ${releaseUrl}\n\nArchive SHA-256: \`${archiveSha256}\`\n\nBinary SHA-256: \`${binarySha256}\`\n\nLicense: MIT; see LICENSE.md for the upstream license and icon attribution.\n\nRegenerate with \`npm run setup:notifier\`; verify offline with \`npm run check:notifier\`.\n`,
    );
    await check();
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

try {
  if (process.argv.includes("--setup")) await setup();
  else await check();
} catch (error) {
  console.error(`${error.message}\nRestore the bundled helper with npm run setup:notifier.`);
  process.exitCode = 1;
}
