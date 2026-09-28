import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(tmpdir(), "session-limits-package-"));
const output = join(root, "release");
const archive = join(output, "session-limits.zip");

try {
  const build = join(temporary, "build");
  execFileSync(join(root, "node_modules", ".bin", "ray"), ["build", "-e", "dist", "-o", build], {
    cwd: root,
    stdio: "inherit",
  });
  const folder = join(temporary, "Session Limits");
  await mkdir(folder);
  for (const name of await readdir(build)) {
    if (name === "package.json" || name === "assets" || name.endsWith(".js")) {
      await cp(join(build, name), join(folder, name), { recursive: true });
    }
  }
  const manifest = JSON.parse(await readFile(join(folder, "package.json"), "utf8"));
  for (const command of manifest.commands) {
    const code = await readFile(join(folder, `${command.name}.js`), "utf8");
    if (/\/(?:Users|home)\/[^/\s"']+\//.test(code) || code.includes(root)) {
      throw new Error(`Local source path found in ${command.name}.js`);
    }
  }
  await cp(join(root, "LICENSE"), join(folder, "LICENSE"));
  await writeFile(
    join(folder, "INSTALL.txt"),
    "Session Limits for Raycast\n\n" +
      "1. Open Raycast and run Import Extension.\n" +
      "2. Select this Session Limits folder.\n" +
      "3. Open Show Session Limits in Raycast.\n\n" +
      "Requires Raycast 2.5.3 or later on macOS. No terminal or build tools needed.\n" +
      "Keep this folder for future imports. Download new releases to update.\n" +
      "https://github.com/vkalipat/raycast-session-limits\n",
  );
  await mkdir(output, { recursive: true });
  await rm(archive, { force: true });
  execFileSync("zip", ["-q", "-X", "-r", archive, "Session Limits"], { cwd: temporary });
  const digest = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  await writeFile(join(output, "SHA256SUMS.txt"), `${digest}  session-limits.zip\n`);
  console.log(`Packaged Session Limits ${manifest.version ?? ""}: ${archive}`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
