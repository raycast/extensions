import { Toast } from "@raycast/api";
import { runPowerShellScript, showFailureToast } from "@raycast/utils";

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
  const res = await safePowershellExec(
    `Get-ItemProperty -Path ${regPath} -Name ${name} | Select-Object -ExpandProperty ${name}`,
  );

  if (res === null) {
    return "light";
  }

  const value = parseInt(res, 10);
  return value === 0 ? "dark" : "light";
}

async function setValue(name: ThemePref, value: number) {
  const current = await safePowershellExec(`Get-ItemProperty -Path ${regPath} -Name ${name}`);

  if (current !== null) {
    const res = await safePowershellExec(`Set-ItemProperty -Path ${regPath} -Name ${name} -Value ${value}`);
    if (res === null) {
      await showFailureToast({
        title: `Failed to set ${name} property`,
        style: Toast.Style.Failure,
      });
    }
    return;
  }

  const res = await safePowershellExec(
    `New-ItemProperty -Path ${regPath} -Name ${name} -Value ${value} -PropertyType DWord`,
  );

  if (res === null) {
    await showFailureToast({
      title: `Failed to create ${name} property`,
      style: Toast.Style.Failure,
    });
  }
}

async function safePowershellExec(script: string) {
  try {
    return await runPowerShellScript(script);
  } catch {
    return null;
  }
}
