import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const packageJsonPath = path.join(repoRoot, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

const dependencies = Object.keys(packageJson.dependencies ?? {});
const devDependencies = Object.keys(packageJson.devDependencies ?? {});

if (dependencies.length === 0 && devDependencies.length === 0) {
  console.log("No dependencies to update.");
  process.exit(0);
}

if (dependencies.length > 0) {
  await run("npm", ["install", ...dependencies.map((dependency) => `${dependency}@latest`), "--save"]);
}

if (devDependencies.length > 0) {
  await run("npm", ["install", ...devDependencies.map((dependency) => `${dependency}@latest`), "--save-dev"]);
}

await run("npm", ["run", "migrate"]);
await run("npm", ["run", "check"]);

console.log("Dependencies updated.");

async function run(command, args) {
  console.log(`> ${[command, ...args].join(" ")}`);

  const child = execFileAsync(command, args, {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 20,
  });

  child.child.stdout?.pipe(process.stdout);
  child.child.stderr?.pipe(process.stderr);

  await child;
}
