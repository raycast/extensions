import { Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { spawnSync, SpawnSyncReturns } from "child_process";

const appThemePref = "AppsUseLightTheme" as const;
const systemThemePref = "SystemUsesLightTheme" as const;
const regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize";

type ThemePref = typeof appThemePref | typeof systemThemePref;
type ThemeValue = "light" | "dark";

export async function winToggleTheme() {
  const theme = await getValue(appThemePref);
  if (theme === "light") {
    await makeDarkTheme();
  } else {
    await makeLightTheme();
  }
}

async function makeLightTheme() {
  await Promise.all([setValue(appThemePref, 1), setValue(systemThemePref, 1)]);
}

async function makeDarkTheme() {
  await Promise.all([setValue(appThemePref, 0), setValue(systemThemePref, 0)]);
}

async function getValue(name: ThemePref): Promise<ThemeValue> {
  const { stdout, exitCode } = await runPowerShellScript([
    `Get-ItemProperty -Path ${regPath} -Name ${name} | Select-Object -ExpandProperty ${name}`,
  ]);

  if (exitCode !== 0) {
    return "light";
  }

  const value = parseInt(stdout.trim(), 10);
  return value === 0 ? "dark" : "light";
}

async function setValue(name: ThemePref, value: number) {
  const { exitCode } = await runPowerShellScript([`Get-ItemProperty -Path ${regPath} -Name ${name}`]);

  if (exitCode !== 0) {
    const { exitCode: newExitCode, stderr: newStderr } = await runPowerShellScript([
      `New-ItemProperty -Path ${regPath} -Name ${name} -Value ${value} -PropertyType DWord`,
    ]);

    if (newExitCode === 0 || newStderr) {
      await showFailureToast({
        title: `Failed to create ${name} property`,
        style: Toast.Style.Failure,
      });
    }
  }

  const { exitCode: setExitCode, stderr: setStderr } = await runPowerShellScript([
    `Set-ItemProperty -Path ${regPath} -Name ${name} -Value ${value}`,
  ]);

  if (setExitCode !== 0 || setStderr) {
    await showFailureToast({
      title: `Failed to set ${name} property`,
      style: Toast.Style.Failure,
    });
  }
}

async function runPowerShellScript(args: string[]) {
  const result = await new Promise<SpawnSyncReturns<string>>((resolve) => {
    const res = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ...args], {
      encoding: "utf8",
    });

    resolve(res);
  });

  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const stderr = typeof result.stderr === "string" ? result.stderr : "";
  const exitCode: number = typeof result.status === "number" ? result.status : result.error ? 1 : 0;

  return { stdout, stderr, exitCode };
}
