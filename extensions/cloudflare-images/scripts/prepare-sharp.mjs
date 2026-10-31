import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
const target = join(root, "assets", "native", "sharp");
mkdirSync(dirname(target), { recursive: true });
const staging = mkdtempSync(join(dirname(target), ".sharp-"));

try {
  // Raycast distributes bundled JavaScript and assets, not node_modules. Keep
  // Sharp's own package layout so its native loader and libvips rpaths still work.
  for (const name of [
    "@mcdays/cloudflare-images-core",
    "sharp",
    "detect-libc",
    "semver",
    "@img/colour",
  ]) {
    const source = join(root, "node_modules", name);
    const metadata = JSON.parse(
      readFileSync(join(source, "package.json"), "utf8"),
    );
    if (metadata.version !== lock.packages[`node_modules/${name}`].version) {
      throw new Error(
        `Install the locked ${name} version before preparing native assets.`,
      );
    }
    cpSync(source, join(staging, "node_modules", name), { recursive: true });
  }

  // Raycast 2 supports Apple Silicon only. These N-API binaries are shared by
  // Node 22 and ordinary Node 26.
  for (const name of [
    "@img/sharp-darwin-arm64",
    "@img/sharp-libvips-darwin-arm64",
  ]) {
    const entry = lock.packages[`node_modules/${name}`];
    if (
      !entry?.resolved?.startsWith("https://registry.npmjs.org/") ||
      !entry.integrity?.startsWith("sha512-")
    ) {
      throw new Error(`Missing verified npm artifact for ${name}.`);
    }
    const response = await fetch(entry.resolved, {
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok)
      throw new Error(`Failed to download ${name}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
    if (integrity !== entry.integrity)
      throw new Error(`Integrity mismatch for ${name}.`);
    const archive = join(staging, "package.tgz");
    writeFileSync(archive, bytes);
    const entries = execFileSync("tar", ["-tzf", archive], {
      encoding: "utf8",
    })
      .trim()
      .split("\n");
    if (
      entries.some(
        (path) =>
          !path.startsWith("package/") || path.split("/").includes(".."),
      )
    ) {
      throw new Error(`Unexpected archive layout for ${name}.`);
    }
    const destination = join(staging, "node_modules", name);
    mkdirSync(destination, { recursive: true });
    execFileSync("tar", [
      "-xzf",
      archive,
      "--strip-components=1",
      "-C",
      destination,
    ]);
    rmSync(archive);
  }
  writeFileSync(
    join(staging, "package.json"),
    JSON.stringify({ private: true, type: "commonjs" }),
  );
  rmSync(target, { recursive: true, force: true });
  renameSync(staging, target);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
