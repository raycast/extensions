import { runPowerShell } from "../powershell";
import type { InstalledGame } from "../types";

interface XboxGame {
  name: string;
  installPath: string;
  launchTarget?: string;
  iconPath?: string;
}

// Reads display name from AppxManifest.xml.
// Many entries use "ms-resource:" references which we can't resolve easily, so we skip those.
async function getXboxGamesWindows(): Promise<XboxGame[]> {
  const script = `
$results = @()
$packages = Get-AppxPackage -PackageTypeFilter Main -ErrorAction SilentlyContinue |
  Where-Object { $_.SignatureKind -eq 'Store' -and $_.InstallLocation }

foreach ($pkg in $packages) {
  $manifestFile = Join-Path $pkg.InstallLocation 'AppxManifest.xml'
  if (-not (Test-Path $manifestFile)) { continue }
  try {
    [xml]$xml = Get-Content $manifestFile -ErrorAction Stop
    $displayName = $xml.Package.Properties.DisplayName
    if (-not $displayName -or $displayName -match '^ms-resource:') { continue }
    $appId = @($xml.Package.Applications.Application)[0].Id
    $launch = if ($appId) { "shell:appsFolder\\$($pkg.PackageFamilyName)!$appId" } else { $null }
    $logo = $null
    $logoRel = @($xml.Package.Applications.Application)[0].VisualElements.Square150x150Logo
    if ($logoRel) {
      $full = Join-Path $pkg.InstallLocation $logoRel
      if (Test-Path -LiteralPath $full) { $logo = $full }
      else {
        $stem = [IO.Path]::GetFileNameWithoutExtension($full)
        $ext = [IO.Path]::GetExtension($full)
        $best = Get-ChildItem -LiteralPath (Split-Path $full) -Filter "$stem.*$ext" -ErrorAction SilentlyContinue |
          Sort-Object Length -Descending | Select-Object -First 1
        if ($best) { $logo = $best.FullName }
      }
    }
    $results += [PSCustomObject]@{ name = $displayName; path = $pkg.InstallLocation; launch = $launch; icon = $logo }
  } catch { continue }
}

if ($results.Count -eq 0) { Write-Output '[]'; return }
$results | ConvertTo-Json -Compress -Depth 1
`;

  try {
    const output = (await runPowerShell(script, 25000)).trim();
    if (!output || output === "[]") return [];
    const parsed: unknown = JSON.parse(output);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items
      .filter(
        (item): item is Record<string, string> =>
          !!item && typeof item === "object",
      )
      .filter((item) => item.name && item.path)
      .map((item) => ({
        name: String(item.name),
        installPath: String(item.path),
        launchTarget: item.launch ? String(item.launch) : undefined,
        iconPath: item.icon ? String(item.icon) : undefined,
      }));
  } catch {
    return [];
  }
}

export async function detectXboxGames(): Promise<InstalledGame[]> {
  if (process.platform !== "win32") return [];

  return (await getXboxGamesWindows()).map((g) => ({
    name: g.name,
    store: "xbox" as const,
    installPath: g.installPath,
    launchTarget: g.launchTarget,
    iconPath: g.iconPath,
  }));
}
