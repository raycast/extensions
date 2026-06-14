import { spawn } from "node:child_process";

const child = spawn("ray", ["develop", "--no-exit-on-error"], {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

const timeout = setTimeout(() => {
  child.kill("SIGINT");
  console.error("Timed out waiting for Raycast local install.");
  process.exit(1);
}, 45000);

let finished = false;

function handleOutput(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);

  if (!finished && text.includes("built extension successfully")) {
    finished = true;
    clearTimeout(timeout);
    setTimeout(() => {
      child.kill("SIGINT");
      process.exit(0);
    }, 1000);
  }
}

child.stdout.on("data", handleOutput);
child.stderr.on("data", handleOutput);

child.on("exit", (code, signal) => {
  if (finished) {
    return;
  }

  clearTimeout(timeout);
  console.error(`Raycast local install exited before completion (${signal ?? code}).`);
  process.exit(code ?? 1);
});
