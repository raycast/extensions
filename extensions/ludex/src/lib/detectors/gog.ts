import { runPowerShell } from "../powershell";
import * as fs from "fs";
import * as path from "path";
import type { InstalledGame } from "../types";

// goggame-<id>.info lists play tasks; running the primary executable works without GOG Galaxy.
function findPrimaryPlayTask(installPath: string): string | undefined {
  try {
    const info = fs
      .readdirSync(installPath)
      .find((f) => /^goggame-.*\.info$/i.test(f));
    if (!info) return undefined;
    const raw = fs
      .readFileSync(path.join(installPath, info), "utf-8")
      .replace(/^\u{FEFF}/u, "");
    const tasks: { type?: string; path?: string; isPrimary?: boolean }[] =
      JSON.parse(raw).playTasks ?? [];

    let first: string | undefined;
    for (const task of tasks) {
      if (task.type !== "FileTask" || !task.path) continue;
      const exe = path.join(installPath, task.path);
      if (!fs.existsSync(exe)) continue;
      if (task.isPrimary) return exe;
      first ??= exe;
    }
    return first;
  } catch {
    return undefined;
  }
}

interface GogGame {
  id: string;
  name: string;
  installPath: string;
}

async function getGogGamesWindows(): Promise<GogGame[]> {
  const script = `
$results = @()
$keys = @('HKLM:\\SOFTWARE\\WOW6432Node\\GOG.com\\Games', 'HKLM:\\SOFTWARE\\GOG.com\\Games')
foreach ($key in $keys) {
  if (-not (Test-Path $key)) { continue }
  Get-ChildItem $key | ForEach-Object {
    $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
    if ($p -and $p.gameName -and $p.path) {
      $id = if ($p.gameId) { $p.gameId } elseif ($p.productId) { $p.productId } else { '' }
      $results += [PSCustomObject]@{ id = $id; name = $p.gameName; path = $p.path }
    }
  }
}
if ($results.Count -eq 0) { Write-Output '[]'; return }
$results | ConvertTo-Json -Compress -Depth 1
`;

  try {
    const output = (await runPowerShell(script, 10000)).trim();
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
        id: String(item.id ?? ""),
        name: String(item.name),
        installPath: String(item.path),
      }));
  } catch {
    return [];
  }
}

export async function detectGogGames(): Promise<InstalledGame[]> {
  if (process.platform !== "win32") {
    // macOS/Linux: GOG Galaxy database detection not implemented
    return [];
  }

  return (await getGogGamesWindows()).map((g) => {
    const exe = findPrimaryPlayTask(g.installPath);
    return {
      name: g.name,
      store: "gog" as const,
      storeGameId: g.id || undefined,
      installPath: g.installPath,
      launchTarget: exe,
      iconPath: exe,
    };
  });
}
