import { runPowerShellScript } from "@raycast/utils";

const REGISTRY_PATHS = [
  "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
  "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
];

export async function getPowerToysInstallPath(): Promise<string | null> {
  try {
    const psCommand = `@(${REGISTRY_PATHS.map((p) => `'${p}'`).join(",")}) | ForEach-Object { Get-ChildItem $_ -ErrorAction SilentlyContinue } | Get-ItemProperty | Where-Object { $_.DisplayName -like '*PowerToys*' -and $_.InstallLocation } | Select-Object -First 1 -ExpandProperty InstallLocation`;

    const result = await runPowerShellScript(psCommand, {
      timeout: 5000,
    });

    const path = result.trim();
    return path || null;
  } catch (error) {
    console.error("Failed to find PowerToys install path:", error);
    return null;
  }
}
