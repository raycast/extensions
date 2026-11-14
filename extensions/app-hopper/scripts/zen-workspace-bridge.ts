import { readFile, writeFile, mkdir, access, unlink } from "node:fs/promises";
import path from "node:path";
import { compileBrowserScript } from "./compile-browser-script";

async function main() {
  const root = path.resolve(__dirname, "..");
  const args = process.argv.slice(2);
  const action = args[0];
  const targetIndex = args.indexOf("--resources");
  const resources = targetIndex >= 0 ? args[targetIndex + 1] : "/Applications/Zen.app/Contents/Resources";
  if (!resources || !["install", "remove", "status"].includes(action)) {
    throw new Error(
      "Usage: node --import tsx scripts/zen-workspace-bridge.ts install|remove|status [--resources PATH]",
    );
  }
  const marker = "// App Hopper Zen workspace bridge v1";
  const config = path.join(resources, "app-hopper-zen.cfg");
  const prefs = path.join(resources, "defaults/pref/app-hopper-zen.js");
  const exists = async (file: string) =>
    access(file).then(
      () => true,
      () => false,
    );
  const owned = async (file: string) => !(await exists(file)) || (await readFile(file, "utf8")).startsWith(marker);
  if (action === "status") {
    console.log(JSON.stringify({ config: await exists(config), loader: await exists(prefs) }));
  } else if (action === "remove") {
    for (const file of [prefs, config]) {
      if (!(await owned(file))) throw new Error(`Refusing to remove unmanaged file: ${file}`);
    }
    for (const file of [prefs, config]) if (await exists(file)) await unlink(file);
    console.log("Removed. Restart Zen to unload the bridge.");
  } else {
    // Never overwrite an existing AutoConfig setup, including a custom filename.
    const { readdir } = await import("node:fs/promises");
    const prefDir = path.dirname(prefs);
    for (const name of await readdir(prefDir).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    })) {
      if (name === path.basename(prefs) || !name.endsWith(".js")) continue;
      if (/general\.config\.(filename|sandbox_enabled)/.test(await readFile(path.join(prefDir, name), "utf8"))) {
        throw new Error(`Existing AutoConfig setup: ${name}. No files changed.`);
      }
    }
    for (const file of [config, prefs]) if (!(await owned(file))) throw new Error(`Unmanaged file: ${file}`);
    const source = compileBrowserScript(path.join(root, "companion/zen-workspace-bridge/bridge.ts"));
    await mkdir(prefDir, { recursive: true });
    await writeFile(config, marker + "\n" + source, { mode: 0o644 });
    await writeFile(
      prefs,
      marker +
        '\npref("general.config.filename", "app-hopper-zen.cfg");\npref("general.config.obscure_value", 0);\npref("general.config.sandbox_enabled", false);\n',
      { mode: 0o644 },
    );
    console.log("Installed. Restart Zen. Requires the Zen companion to be loaded separately.");
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
