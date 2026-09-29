import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import runtime from "../codex-runtime.json" with { type: "json" };

const execFileAsync = promisify(execFile);
const root = process.cwd();
const assetsDir = path.join(root, "assets", "codex-runtime");

async function archiveIsValid(archivePath, target) {
  try {
    const stats = await fs.stat(archivePath);
    if (!stats.isFile() || stats.size < 100_000) return false;
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
    if (hash.digest("hex") !== runtime.sha256[target]) return false;
    const { stdout } = await execFileAsync("tar", ["-tzf", archivePath], { maxBuffer: 20 * 1024 * 1024 });
    const binary = target.includes("windows") ? "codex.exe" : "codex";
    return stdout.split("\n").some((entry) => entry.endsWith(`/bin/${binary}`));
  } catch {
    return false;
  }
}

function execNpm(args) {
  if (process.env.npm_execpath) {
    return execFileAsync(process.execPath, [process.env.npm_execpath, ...args], {
      cwd: root,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 120_000,
    });
  }

  return execFileAsync("npm", args, {
    cwd: root,
    maxBuffer: 20 * 1024 * 1024,
    timeout: 120_000,
    shell: process.platform === "win32",
  });
}

async function main() {
  await fs.mkdir(assetsDir, { recursive: true });
  const expectedArchives = new Set();
  for (const [target, suffix] of Object.entries(runtime.packages)) {
    const archivePath = path.join(assetsDir, `${target}-${runtime.version}.tgz`);
    expectedArchives.add(path.basename(archivePath));
    if (await archiveIsValid(archivePath, target)) continue;
    const { stdout } = await execNpm([
      "pack",
      `@openai/codex@${runtime.version}-${suffix}`,
      "--json",
      "--pack-destination",
      assetsDir,
    ]);
    const [{ filename }] = JSON.parse(stdout);
    const packedPath = path.join(assetsDir, filename);
    if (!(await archiveIsValid(packedPath, target))) throw new Error(`Invalid Codex runtime archive for ${target}`);
    await fs.rename(packedPath, archivePath);
  }
  for (const entry of await fs.readdir(assetsDir)) {
    if (entry.endsWith(".tgz") && !expectedArchives.has(entry)) {
      await fs.rm(path.join(assetsDir, entry));
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
