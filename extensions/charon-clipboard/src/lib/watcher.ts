import { environment } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";
import { writeHelperConfig } from "./config";
import { filePath } from "./storage";
import { buildPlist, LABEL } from "./watcher-script";

const exec = promisify(execFile);
const domain = () => `gui/${process.getuid?.() ?? 501}`;

export const paths = {
  get script() {
    return filePath("helper.js");
  },
  get log() {
    return filePath("helper.stderr.log");
  },
  get plist() {
    return join(homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);
  },
  get enabledFlag() {
    return filePath("helper-enabled");
  },
};

function bundledScript() {
  return readFileSync(join(environment.assetsPath, "helper.js"), "utf8");
}

/** The helper is opt-in: nothing is installed until the user runs Enable Clipboard Helper. */
export function isHelperEnabled() {
  return existsSync(paths.enabledFlag);
}

export async function isHelperRunning(): Promise<boolean> {
  try {
    const { stdout } = await exec("/bin/launchctl", ["print", `${domain()}/${LABEL}`]);
    return /state = running/.test(stdout);
  } catch {
    return false;
  }
}

function isInstalledCurrent() {
  try {
    return existsSync(paths.plist) && readFileSync(paths.script, "utf8") === bundledScript();
  } catch {
    return false;
  }
}

async function bootout() {
  await exec("/bin/launchctl", ["bootout", `${domain()}/${LABEL}`]).catch(() => undefined);
}

async function install() {
  writeHelperConfig();
  writeFileSync(paths.script, bundledScript(), "utf8");
  mkdirSync(join(homedir(), "Library", "LaunchAgents"), { recursive: true });
  writeFileSync(paths.plist, buildPlist(paths.script, environment.supportPath, paths.log), "utf8");
  await bootout();
  await exec("/bin/launchctl", ["bootstrap", domain(), paths.plist]);
}

export async function enableHelper() {
  writeFileSync(paths.enabledFlag, new Date().toISOString(), "utf8");
  await install();
}

export async function disableHelper() {
  if (existsSync(paths.enabledFlag)) unlinkSync(paths.enabledFlag);
  await bootout();
  if (existsSync(paths.plist)) unlinkSync(paths.plist);
}

/** If the helper is enabled but stopped or outdated, (re)install it. Returns true when it was started. */
export async function ensureHelper(): Promise<boolean> {
  writeHelperConfig();
  if (!isHelperEnabled()) return false;
  if (isInstalledCurrent() && (await isHelperRunning())) return false;
  await install();
  return true;
}
