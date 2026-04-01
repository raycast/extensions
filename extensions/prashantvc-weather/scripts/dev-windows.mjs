import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = dirname(__dirname);
const outDir = join(os.homedir(), ".config", "raycast-x", "extensions", "prashantvc-weather");
const assetsDir = join(outDir, "assets");

mkdirSync(assetsDir, { recursive: true });

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
writeFileSync(join(outDir, "package.json"), JSON.stringify(packageJson, null, 2));

if (existsSync(join(root, "HELP.md"))) {
	cpSync(join(root, "HELP.md"), join(outDir, "HELP.md"), { force: true });
}

cpSync(join(root, "assets"), assetsDir, { recursive: true, force: true });
cpSync(join(root, "assets", "command-icon.png"), join(outDir, "command-icon.png"), { force: true });
cpSync(join(root, "assets", "command-icon.png"), join(assetsDir, "extension-icon.png"), { force: true });

await build({
	entryPoints: [join(root, "src", "weather.tsx")],
	outfile: join(outDir, "weather.js"),
	bundle: true,
	format: "cjs",
	platform: "node",
	target: "node20",
	sourcemap: true,
	jsx: "automatic",
	external: ["@raycast/api", "react"],
	logLevel: "info",
});

console.log(`Synced extension to ${outDir}`);
