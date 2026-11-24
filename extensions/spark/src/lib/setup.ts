import { Application, getApplications } from "@raycast/api";
import { execFile } from "node:child_process";
import { basename } from "node:path";
import { promisify } from "node:util";
import { IS_WINDOWS, SparkError } from "./spark";

const execFileAsync = promisify(execFile);

const SPARK_BUNDLE_IDS = [
  "com.readdle.SparkDesktop",
  "com.readdle.SparkDesktop.appstore",
  "com.readdle.SparkDesktop.beta",
];

/// On Windows the apps have no bundle ID; each is named after its product,
/// as is its `.exe`.
const SPARK_WINDOWS_NAMES = ["Spark Desktop", "Spark Desktop (Beta)"];

/// Every Spark Desktop installed (release, App Store, Beta), in that order.
export async function installedSparkApps(): Promise<Application[]> {
  const apps = await getApplications();
  if (IS_WINDOWS) {
    return SPARK_WINDOWS_NAMES.flatMap((name) => apps.filter((app) => app.name === name));
  }
  return SPARK_BUNDLE_IDS.flatMap((id) => apps.filter((app) => app.bundleId === id));
}

/// What the user has to do before the extension can reach Spark.
export type SetupStep = "download" | "enable" | "launch" | "update";

/// Narrows a failure to reach Spark down to the step that fixes it. The CLI
/// can't tell "Spark isn't running" from "Spark CLI is turned off" - it can't
/// reach the app either way - so whether Spark is running decides.
export async function setupStep(error: Error): Promise<SetupStep | undefined> {
  if (!(error instanceof SparkError)) return undefined;
  switch (error.kind) {
    case "outdated":
      return "update";
    case "notInstalled":
      // CLI Setup installs `spark`; without it, Spark is either missing or
      // has the CLI turned off.
      return (await installedSparkApps()).length ? "enable" : "download";
    case "notRunning":
      return (await isSparkRunning()) ? "enable" : "launch";
    default:
      return undefined;
  }
}

async function isSparkRunning(): Promise<boolean> {
  return (await runningSparkApp()) !== undefined;
}

/// The installed Spark Desktop that's running, if any.
export async function runningSparkApp(): Promise<Application | undefined> {
  const apps = await installedSparkApps();
  try {
    if (IS_WINDOWS) {
      // CSV rows, the image name first: "Spark Desktop.exe","1234",…
      const { stdout } = await execFileAsync("tasklist", ["/FO", "CSV", "/NH"], { windowsHide: true });
      const images = new Set(stdout.split(/\r?\n/).map((row) => row.split('","')[0].replace(/^"/, "").toLowerCase()));
      return apps.find(
        (app) => images.has(`${app.name}.exe`.toLowerCase()) || images.has(basename(app.path).toLowerCase()),
      );
    }
    const { stdout } = await execFileAsync("/bin/ps", ["-axo", "comm="]);
    const commands = stdout.split("\n");
    return apps.find((app) => commands.some((command) => command.startsWith(`${app.path}/Contents/MacOS/`)));
  } catch {
    return undefined;
  }
}
