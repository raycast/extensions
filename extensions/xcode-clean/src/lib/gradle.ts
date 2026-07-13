import { execFile, spawn } from "child_process";
import { promises as fs } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// The bracket trick ([G] matches "G" but the pattern string itself contains
// "[G]") keeps pgrep/pkill from matching any process whose command line
// contains this very pattern.
const DAEMON_PATTERN = "[G]radleDaemon|[K]otlinCompileDaemon";

// Raycast launches processes with a minimal PATH and no JAVA_HOME, so the
// Gradle wrapper often cannot find a JDK installed via Homebrew, SDKMAN, or
// Android Studio. Build an extended environment once and reuse it.
let cachedEnv: NodeJS.ProcessEnv | null = null;

async function dirExists(path: string): Promise<boolean> {
  try {
    return (await fs.stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function gradleEnv(): Promise<NodeJS.ProcessEnv> {
  if (cachedEnv) return cachedEnv;
  const env = { ...process.env };
  const sdkmanJava = join(homedir(), ".sdkman/candidates/java/current");
  env.PATH = [
    env.PATH,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    join(sdkmanJava, "bin"),
  ]
    .filter(Boolean)
    .join(":");
  if (!env.JAVA_HOME) {
    try {
      const { stdout } = await execFileAsync("/usr/libexec/java_home");
      const home = stdout.trim();
      if (home) env.JAVA_HOME = home;
    } catch {
      // No JDK registered with java_home; try SDKMAN, then the JetBrains
      // Runtime bundled with Android Studio, before giving up and letting
      // gradlew fall back to a PATH lookup.
      const studioJbr =
        "/Applications/Android Studio.app/Contents/jbr/Contents/Home";
      if (await dirExists(sdkmanJava)) env.JAVA_HOME = sdkmanJava;
      else if (await dirExists(studioJbr)) env.JAVA_HOME = studioJbr;
    }
  }
  cachedEnv = env;
  return env;
}

async function runGradlew(
  projectPath: string,
  args: string[],
): Promise<string> {
  const env = await gradleEnv();
  return new Promise((resolve, reject) => {
    // Run through sh so a missing execute bit on gradlew doesn't matter.
    const child = spawn("/bin/sh", ["./gradlew", ...args], {
      cwd: projectPath,
      env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else
        reject(
          new Error(
            stderr.trim() ||
              stdout.trim() ||
              `gradlew exited with code ${code}`,
          ),
        );
    });
  });
}

export function runGradlewClean(projectPath: string): Promise<string> {
  return runGradlew(projectPath, ["clean"]);
}

export async function tryStopGradleDaemon(projectPath: string): Promise<void> {
  try {
    await runGradlew(projectPath, ["--stop"]);
  } catch {
    // Best effort: a failing --stop must not block the deep clean.
  }
}

export async function deepCleanProject(projectPath: string): Promise<void> {
  await tryStopGradleDaemon(projectPath);
  // Delete every build/ directory; -prune keeps find from descending into
  // directories that are already being deleted.
  await execFileAsync("find", [
    projectPath,
    "-type",
    "d",
    "-name",
    "build",
    "-prune",
    "-exec",
    "rm",
    "-rf",
    "{}",
    "+",
  ]);
  await fs.rm(join(projectPath, ".gradle"), { recursive: true, force: true });
}

export async function listGradleDaemons(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("pgrep", ["-fl", DAEMON_PATTERN]);
    return stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    // pgrep exits 1 when nothing matches.
    return [];
  }
}

export async function killAllGradleDaemons(): Promise<number> {
  const daemons = await listGradleDaemons();
  if (daemons.length === 0) return 0;
  try {
    await execFileAsync("pkill", ["-f", DAEMON_PATTERN]);
  } catch {
    // pkill exits 1 when nothing matched (daemons may have exited meanwhile).
  }
  return daemons.length;
}
