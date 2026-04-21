import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runPowerShellScript } from "@raycast/utils";

function extractPlistValue(plist: string, key: string): string | undefined {
  const match = plist.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`));
  return match?.[1];
}

function findIcnsFile(resourcesPath: string, iconBaseName?: string): string | undefined {
  if (iconBaseName) {
    const direct = join(resourcesPath, iconBaseName.endsWith(".icns") ? iconBaseName : `${iconBaseName}.icns`);
    if (existsSync(direct)) return direct;
  }

  const files = readdirSync(resourcesPath);
  const preferred = files.find((file) => file.toLowerCase().includes("icon") && file.toLowerCase().endsWith(".icns"));
  if (preferred) return join(resourcesPath, preferred);

  const anyIcns = files.find((file) => file.toLowerCase().endsWith(".icns"));
  return anyIcns ? join(resourcesPath, anyIcns) : undefined;
}

function toImageSource(source: string): string {
  if (/^https?:\/\//i.test(source) || source.startsWith("file://")) return source;
  return pathToFileURL(resolve(source)).toString();
}

async function resolveWindowsAppIcon(target: string): Promise<string | undefined> {
  const script = `
param([string]$Target)
if (-not (Test-Path -LiteralPath $Target)) { exit 0 }

Add-Type -AssemblyName System.Drawing | Out-Null
$resolved = $Target
if ($Target.ToLower().EndsWith('.lnk')) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Target)
  if ($shortcut.TargetPath) { $resolved = $shortcut.TargetPath }
}

if (-not ($resolved.ToLower().EndsWith('.exe'))) { exit 0 }

$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($resolved)
if ($null -eq $icon) { exit 0 }

$bitmap = $icon.ToBitmap()
$tempFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), ([System.Guid]::NewGuid().ToString() + '.png'))
$bitmap.Save($tempFile, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
$icon.Dispose()
Write-Output $tempFile
`;

  try {
    const output = await runPowerShellScript(script, {
      parseOutput: ({ stdout }) => stdout.trim(),
      timeout: 10000,
    });
    return output.length > 0 ? toImageSource(output) : undefined;
  } catch {
    return undefined;
  }
}

export async function resolveAppIcon(target: string, explicitIcon?: string): Promise<string | undefined> {
  if (explicitIcon) return toImageSource(explicitIcon);

  if (process.platform === "win32") {
    if (target.toLowerCase().endsWith(".exe") || target.toLowerCase().endsWith(".lnk")) {
      return resolveWindowsAppIcon(target);
    }
    return undefined;
  }

  if (!target.endsWith(".app")) return undefined;

  const bundlePath = resolve(target);
  const plistPath = join(bundlePath, "Contents", "Info.plist");
  const resourcesPath = join(bundlePath, "Contents", "Resources");
  if (!existsSync(plistPath) || !existsSync(resourcesPath)) return undefined;

  const plist = readFileSync(plistPath, "utf8");
  const iconName = extractPlistValue(plist, "CFBundleIconFile") ?? extractPlistValue(plist, "CFBundleIconName");
  const iconPath = findIcnsFile(resourcesPath, iconName);
  return iconPath ? toImageSource(iconPath) : undefined;
}
