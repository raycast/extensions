import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CODEX_VERSION = "0.122.0";

const PLATFORM_PACKAGE_BY_TARGET = {
  "x86_64-apple-darwin": `@openai/codex@${CODEX_VERSION}-darwin-x64`,
  "aarch64-apple-darwin": `@openai/codex@${CODEX_VERSION}-darwin-arm64`,
  "x86_64-pc-windows-msvc": `@openai/codex@${CODEX_VERSION}-win32-x64`,
  "aarch64-pc-windows-msvc": `@openai/codex@${CODEX_VERSION}-win32-arm64`,
};

const root = process.cwd();
const assetsDir = path.join(root, "assets", "codex-runtime");

async function main() {
  const targetTriple = resolveTargetTriple();
  const packageSpecifier = PLATFORM_PACKAGE_BY_TARGET[targetTriple];
  if (!packageSpecifier) {
    console.warn(`Skipping Codex runtime vendoring for unsupported platform ${process.platform} (${process.arch}).`);
    return;
  }

  const archivePath = path.join(assetsDir, `${targetTriple}-${CODEX_VERSION}.tgz`);
  if (await fileExists(archivePath)) {
    return;
  }

  await fs.mkdir(assetsDir, { recursive: true });

  const { stdout } = await execNpm(["pack", packageSpecifier, "--json", "--pack-destination", assetsDir]);

  const [{ filename }] = JSON.parse(stdout);
  await fs.rename(path.join(assetsDir, filename), archivePath);
}

function execNpm(args) {
  if (process.env.npm_execpath) {
    return execFileAsync(process.execPath, [process.env.npm_execpath, ...args], {
      cwd: root,
      maxBuffer: 20 * 1024 * 1024,
    });
  }

  return execFileAsync("npm", args, {
    cwd: root,
    maxBuffer: 20 * 1024 * 1024,
    shell: process.platform === "win32",
  });
}

function resolveTargetTriple() {
  if (process.platform === "darwin") {
    if (process.arch === "arm64") {
      return "aarch64-apple-darwin";
    }
    if (process.arch === "x64") {
      return "x86_64-apple-darwin";
    }
  }

  if (process.platform === "win32") {
    if (process.arch === "arm64") {
      return "aarch64-pc-windows-msvc";
    }
    if (process.arch === "x64") {
      return "x86_64-pc-windows-msvc";
    }
  }

  return null;
}

async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
