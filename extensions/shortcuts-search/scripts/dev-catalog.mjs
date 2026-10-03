import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
const origin = process.argv[process.argv.indexOf("--origin") + 1];
if (!process.argv.includes("--origin")) throw new Error("Use npm run dev:catalog -- --origin http://localhost:3000");
const url = new URL(origin);
if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Provide an HTTP(S) origin without credentials or a path");
const file = "assets/catalog-development.json";
if (existsSync(file)) throw new Error("A catalog development session already exists. Close it before starting another.");
writeFileSync(file, JSON.stringify({ origin: url.origin }));
const child = spawn("node_modules/.bin/ray", ["develop"], { stdio: "inherit" });
let cleaned = false;
function cleanup() { if (!cleaned) { cleaned = true; if (existsSync(file)) unlinkSync(file); } }
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { child.kill(signal); cleanup(); });
child.on("error", error => { cleanup(); console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { cleanup(); process.exitCode = code ?? 1; });
