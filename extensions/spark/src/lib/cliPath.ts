// Where the `spark` CLI is on Windows.
//
// No Raycast imports here: this file runs under `node --test` as-is.

/// Spark CLI Setup on Windows doesn't copy the CLI anywhere: it puts the folder
/// that holds `spark.exe` first in the user's `Path` (`HKCU\Environment`). A
/// Raycast started before the setup still has the old PATH, so the registry's
/// `Path` is searched as well as the process's.
export function windowsSearchDirs(processPath: string | undefined, registryPath: string | undefined): string[] {
  const dirs = [...(registryPath ?? "").split(";"), ...(processPath ?? "").split(";")]
    .map((dir) => dir.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);
  const seen = new Set<string>();
  return dirs.filter((dir) => !seen.has(dir.toLowerCase()) && seen.add(dir.toLowerCase()));
}

/// The `Path` value in `reg query HKCU\Environment /v Path` output, with
/// `%NAME%` references expanded (it's usually `REG_EXPAND_SZ`). Undefined when
/// the output has no `Path` value.
export function registryPathValue(regOutput: string, env: Record<string, string | undefined>): string | undefined {
  const match = regOutput.match(/^\s*Path\s+REG_(?:EXPAND_)?SZ\s+(.*)$/im);
  if (!match) return undefined;
  return expandVariables(match[1].trim(), env);
}

/// Expands `%NAME%` the way Windows does: names are case-insensitive, and an
/// unknown name is left as it is.
export function expandVariables(value: string, env: Record<string, string | undefined>): string {
  const lowered = new Map(Object.entries(env).map(([name, v]) => [name.toLowerCase(), v]));
  return value.replace(/%([^%;]+)%/g, (whole, name: string) => lowered.get(name.toLowerCase()) ?? whole);
}
