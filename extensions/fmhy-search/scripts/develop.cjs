const { spawn } = require("node:child_process");
const path = require("node:path");

const raycastCli = path.join(__dirname, "..", "node_modules", "@raycast", "api", "bin", "run.js");
const protocolPatch = path.join(__dirname, "raycast-windows-protocol.cjs");
const args =
  process.platform === "win32"
    ? ["--require", protocolPatch, raycastCli, "develop", ...process.argv.slice(2)]
    : [raycastCli, "develop", ...process.argv.slice(2)];
const env = { ...process.env };

if (process.platform === "win32") {
  delete env.RAY_Target;
}

env.NODE_OPTIONS = env.NODE_OPTIONS ? `${env.NODE_OPTIONS} --max-old-space-size=4096` : "--max-old-space-size=4096";

const child = spawn(process.execPath, args, {
  env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
