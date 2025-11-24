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
  const { error, data: res } = await safePowershellExec(
    `Get-ItemProperty -Path ${regPath} -Name ${name} | Select-Object -ExpandProperty ${name}`,
  );

  if (error) {
    return "light";
  }

  const value = parseInt(res, 10);
  return value === 0 ? "dark" : "light";
}

async function setValue(name: ThemePref, value: number) {
  const { error: currentError } = await safePowershellExec(`Get-ItemProperty -Path ${regPath} -Name ${name}`);

  if (currentError === null) {
    const { error: setError } = await safePowershellExec(
      `Set-ItemProperty -Path ${regPath} -Name ${name} -Value ${value}`,
    );
    if (setError) {
      await showFailureToast(setError, { title: `Failed to set ${name} property` });
    }
    return;
  }

  const { error: newError } = await safePowershellExec(
    `New-ItemProperty -Path ${regPath} -Name ${name} -Value ${value} -PropertyType DWord`,
  );

  if (newError) {
    await showFailureToast(newError, { title: `Failed to create ${name} property` });
  }
}

async function safePowershellExec(script: string) {
  try {
    return { error: null, data: await runPowerShellScript(script) };
  } catch (error) {
    return { error: error as Error, data: null };
  }
}
