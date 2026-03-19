import { Clipboard, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
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

    const launchEnvPath = path.join(schedulePaths.launchdDir, "launch_env.sh");
    const launchEnvLines = [
      `export AGENT_ROOT=${shellQuote(prepared.agentRoot)}`,
      `export CONFIG_PATH=${shellQuote(schedulePaths.mergedConfigPath)}`,
      `export PYTHON_BIN=${shellQuote(prepared.pythonBin)}`,
      `export STATE_DIR=${shellQuote(schedulePaths.stateDir)}`,
      `export LOG_DIR=${shellQuote(schedulePaths.logDir)}`,
      `export ENV_FILE=${shellQuote(schedulePaths.envFilePath)}`,
      `export RUN_HOUR=${DAILY_SCHEDULE_HOUR}`,
    ];
    fs.writeFileSync(launchEnvPath, `${launchEnvLines.join("\n")}\n`, { encoding: "utf-8", mode: 0o644 });

    const runDailyPath = path.join(schedulePaths.launchdDir, "run_daily.sh");
    const runDailyScript = `#!/bin/zsh
set -u
LAUNCHD_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$LAUNCHD_DIR/launch_env.sh"
RUNNER="$AGENT_ROOT/scripts/run_paper_agent.sh"
# Wait for agent root to become available (e.g. iCloud Desktop / external drive after login). Retry every 15s for up to 2 minutes.
WAIT_MAX=8
WAIT_SEC=15
n=0
while [ $n -le $WAIT_MAX ]; do
  [ $n -gt 0 ] && sleep $WAIT_SEC
  if [ -f "$RUNNER" ] && [ -r "$RUNNER" ]; then
    break
  fi
  n=$((n + 1))
done
if [ ! -f "$RUNNER" ] || [ ! -r "$RUNNER" ]; then
  STATUS_FILE="$STATE_DIR/last_run_status.json"
  mkdir -p "$STATE_DIR"
  NOW="$(date '+%Y-%m-%d %H:%M:%S')"
  DATE="$(date +%F)"
  printf '%s\\n' "{\\"mode\\":\\"daily-launchd\\",\\"date\\":\\"\${DATE}\\",\\"status\\":\\"skipped\\",\\"reason\\":\\"agent-root-unavailable\\",\\"exit_code\\":\\"0\\",\\"started_at\\":\\"\${NOW}\\",\\"finished_at\\":\\"\${NOW}\\",\\"log_path\\":\\"\\",\\"config_path\\":\\"\\",\\"agent_root\\":\\"\\"}" > "$STATUS_FILE"
  exit 0
fi
# Copy runner to LaunchAgent dir and run the copy so launchd can execute it (avoids "can't open input file" when agent root is on Desktop/iCloud/external).
RUNNER_COPY="$LAUNCHD_DIR/run_paper_agent_exec.sh"
if ! cp "$RUNNER" "$RUNNER_COPY"; then
  STATUS_FILE="$STATE_DIR/last_run_status.json"
  mkdir -p "$STATE_DIR"
  NOW="$(date '+%Y-%m-%d %H:%M:%S')"
  DATE="$(date +%F)"
  printf '%s\\n' "{\\"mode\\":\\"daily-launchd\\",\\"date\\":\\"\${DATE}\\",\\"status\\":\\"skipped\\",\\"reason\\":\\"agent-root-permission-denied\\",\\"exit_code\\":\\"0\\",\\"started_at\\":\\"\${NOW}\\",\\"finished_at\\":\\"\${NOW}\\",\\"log_path\\":\\"\\",\\"config_path\\":\\"\\",\\"agent_root\\":\\"\\"}" > "$STATUS_FILE"
  exit 0
fi
chmod 755 "$RUNNER_COPY"
exec /bin/zsh "$RUNNER_COPY" --mode daily-launchd --run-hour "$RUN_HOUR" --agent-root "$AGENT_ROOT" --python "$PYTHON_BIN" --config "$CONFIG_PATH" --state-dir "$STATE_DIR" --log-dir "$LOG_DIR" --env-file "$ENV_FILE"
`;
    fs.writeFileSync(runDailyPath, runDailyScript, { encoding: "utf-8", mode: 0o755 });

    const programArguments = ["/bin/zsh", runDailyPath];
    const workingDirectory = schedulePaths.launchdDir;

    fs.writeFileSync(
      schedulePaths.plistPath,
      renderPlist(programArguments, workingDirectory, schedulePaths.stdoutPath, schedulePaths.stderrPath),
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
