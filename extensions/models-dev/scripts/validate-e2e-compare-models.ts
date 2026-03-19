import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Child = ReturnType<typeof spawn>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeStreamToFile(child: Child, filePath: string) {
  const stream = fs.createWriteStream(filePath, { flags: "w" });
  child.stdout?.pipe(stream, { end: false });
  child.stderr?.pipe(stream, { end: false });
  child.on("close", () => stream.end());
  return stream;
}

function killProcess(child: Child | undefined, signal: NodeJS.Signals = "SIGTERM") {
  if (!child) return;
  if (child.killed) return;
  try {
    child.kill(signal);
  } catch {
    // ignore
  }
}

function fileContainsAny(filePath: string, needles: string[]) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  return needles.some((n) => content.includes(n));
}

async function main() {
  const repoRoot = process.cwd();
  const outDir = path.join(repoRoot, ".e2e");
  ensureDir(outDir);

  const devLogPath = path.join(outDir, "compare-models.dev.log");
  const rayLogPath = path.join(outDir, "compare-models.raycast.log");
  const osascriptLogPath = path.join(outDir, "compare-models.osascript.log");

  console.log("Running Raycast E2E: compare-models (2 selections)");
  console.log(`Artifacts: ${outDir}`);

  let devProc: Child | undefined;
  let logProc: Child | undefined;
  let osascriptProc: Child | undefined;

  const crashNeedles = [
    "JavaScript heap out of memory",
    "JS heap out of memory",
    "Worker terminated",
    "FATAL ERROR",
    "Allocation failed",
    "EXC_RESOURCE",
    "Killed: 9",
  ];

  try {
    // Start extension dev mode. This should keep running unless an error occurs.
    devProc = spawn("npm", ["run", "dev", "--", "--non-interactive", "--exit-on-error"], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    writeStreamToFile(devProc, devLogPath);

    // Capture Raycast unified logs.
    logProc = spawn(
      "log",
      ["stream", "--predicate", 'subsystem == "com.raycast.macos"', "--level", "debug", "--style", "compact"],
      {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      },
    );
    writeStreamToFile(logProc, rayLogPath);

    // Give dev mode time to initialize.
    await sleep(4000);

    if (devProc.exitCode !== null) {
      throw new Error(`ray develop exited early with code ${devProc.exitCode}`);
    }

    // Drive the UI via AppleScript.
    osascriptProc = spawn("osascript", [path.join(repoRoot, "scripts", "e2e-compare-models.applescript")], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    writeStreamToFile(osascriptProc, osascriptLogPath);

    const osascriptExit = await new Promise<number>((resolve) => {
      osascriptProc?.on("exit", (code) => resolve(code ?? 1));
    });

    if (osascriptExit !== 0) {
      throw new Error(`osascript exited with code ${osascriptExit}. Check ${osascriptLogPath}`);
    }

    // Allow time for potential worker crash to surface.
    await sleep(5000);

    if (devProc.exitCode !== null) {
      throw new Error(`ray develop exited with code ${devProc.exitCode}. Check ${devLogPath}`);
    }

    const devHasCrash = fileContainsAny(devLogPath, crashNeedles);
    const rayHasCrash = fileContainsAny(rayLogPath, crashNeedles);
    if (devHasCrash || rayHasCrash) {
      throw new Error(`Crash indicators found in logs. Check ${devLogPath} and ${rayLogPath}`);
    }

    console.log("PASS: no crash detected during 2nd selection");
  } finally {
    // Tear down processes.
    killProcess(osascriptProc, "SIGTERM");
    killProcess(logProc, "SIGTERM");
    killProcess(devProc, "SIGTERM");
    await sleep(500);
    killProcess(logProc, "SIGKILL");
    killProcess(devProc, "SIGKILL");
  }
}

main().catch((err) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
});
