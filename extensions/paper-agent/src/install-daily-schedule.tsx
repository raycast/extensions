import { getPreferenceValues, popToRoot, showToast, Toast, Clipboard } from "@raycast/api";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { checkCoreAvailable, CORE_INSTALL_URL, getBootstrapCopyText } from "./core-check";
import {
  isValidEnvVarName,
  buildScheduleSecrets,
  DAILY_SCHEDULE_HOUR,
  DAILY_SCHEDULE_LABEL,
  getSchedulePaths,
  prepareRun,
} from "./run-utils";

const execFileAsync = promisify(execFile);

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function shellQuote(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
  return `"${escaped}"`;
}

function renderPlist(
  programArguments: string[],
  workingDirectory: string,
  stdoutPath: string,
  stderrPath: string,
): string {
  const args = programArguments.map((arg) => `    <string>${xmlEscape(arg)}</string>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${DAILY_SCHEDULE_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${args}
  </array>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(workingDirectory)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${DAILY_SCHEDULE_HOUR}</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${xmlEscape(stdoutPath)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(stderrPath)}</string>
</dict>
</plist>
`;
}

async function reloadLaunchAgent(plistPath: string): Promise<void> {
  const uid = process.getuid?.();
  if (uid === undefined) {
    throw new Error("launchd installation is only supported on macOS.");
  }
  const target = `gui/${uid}`;
  try {
    await execFileAsync("/bin/launchctl", ["bootout", target, plistPath]);
  } catch {
    // Ignore "not loaded" errors on first install.
  }
  await execFileAsync("/bin/launchctl", ["bootstrap", target, plistPath]);
}

export default async function Command() {
  const prefs = getPreferenceValues<Preferences.InstallDailySchedule>();
  let cleanup: (() => void) | null = null;

  const core = await checkCoreAvailable({
    configPath: prefs.configPath,
    paperDir: prefs.paperDir,
    pythonPath: prefs.pythonPath,
  });
  if (!core.ok) {
    await Clipboard.copy(getBootstrapCopyText());
    await showToast({
      style: Toast.Style.Failure,
      title: "Core not found",
      message: `Install: ${CORE_INSTALL_URL}. Bootstrap command copied to clipboard.`,
    });
    await popToRoot({ clearSearchBar: true });
    return;
  }

  try {
    const schedulePaths = getSchedulePaths();
    const prepared = prepareRun(prefs, { persistConfigPath: schedulePaths.mergedConfigPath });
    cleanup = prepared.cleanup;

    fs.mkdirSync(schedulePaths.launchdDir, { recursive: true });
    fs.mkdirSync(schedulePaths.stateDir, { recursive: true });
    fs.mkdirSync(schedulePaths.logDir, { recursive: true });
    fs.mkdirSync(path.dirname(schedulePaths.plistPath), { recursive: true });

    const secrets = buildScheduleSecrets(prefs);
    const envLines = Object.entries(secrets).map(([key, value]) => {
      if (!isValidEnvVarName(key)) {
        throw new Error(`Invalid environment variable name '${key}'. Use [A-Za-z_][A-Za-z0-9_]*.`);
      }
      return `export ${key}=${shellQuote(value)}`;
    });
    fs.writeFileSync(schedulePaths.envFilePath, `${envLines.join("\n")}\n`, { encoding: "utf-8", mode: 0o600 });
    fs.chmodSync(schedulePaths.envFilePath, 0o600);

    const runnerPath = path.join(prepared.agentRoot, "scripts", "run_paper_agent.sh");
    const programArguments = [
      "/bin/zsh",
      runnerPath,
      "--mode",
      "daily-launchd",
      "--run-hour",
      String(DAILY_SCHEDULE_HOUR),
      "--agent-root",
      prepared.agentRoot,
      "--python",
      prepared.pythonBin,
      "--config",
      schedulePaths.mergedConfigPath,
      "--state-dir",
      schedulePaths.stateDir,
      "--log-dir",
      schedulePaths.logDir,
      "--env-file",
      schedulePaths.envFilePath,
    ];

    fs.writeFileSync(
      schedulePaths.plistPath,
      renderPlist(programArguments, prepared.agentRoot, schedulePaths.stdoutPath, schedulePaths.stderrPath),
      "utf-8",
    );

    await reloadLaunchAgent(schedulePaths.plistPath);

    await showToast({
      style: Toast.Style.Success,
      title: "Daily schedule installed",
      message: "Runs at 04:00 and catches up once after boot/login when missed.",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to install daily schedule",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (cleanup) {
      cleanup();
    }
    await popToRoot({ clearSearchBar: true });
  }
}
