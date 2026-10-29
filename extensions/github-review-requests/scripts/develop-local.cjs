const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const preview = path.join(root, ".local-preview");
fs.mkdirSync(preview, { recursive: true });
for (const name of ["src", "assets"]) {
  fs.rmSync(path.join(preview, name), { recursive: true, force: true });
  fs.cpSync(path.join(root, name), path.join(preview, name), { recursive: true });
}
for (const name of ["tsconfig.json", "README.md"]) fs.copyFileSync(path.join(root, name), path.join(preview, name));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
manifest.name = "github-review-requests-local";
manifest.title = "GitHub Review Requests (Local)";
for (const command of manifest.commands) command.subtitle = "GitHub Review Requests (Local)";
fs.writeFileSync(path.join(preview, "package.json"), JSON.stringify(manifest, null, 2));
const modules = path.join(preview, "node_modules");
if (!fs.existsSync(modules)) fs.symlinkSync(path.join(root, "node_modules"), modules, "dir");
console.log("Starting isolated local extension. Its preferences and storage are separate from the Store extension.");
console.log("Restart npm run dev after editing source files to refresh the local preview.");
const child = spawn(path.join(root, "node_modules/.bin/ray"), ["develop"], { cwd: preview, stdio: "inherit" });
child.on("exit", code => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
