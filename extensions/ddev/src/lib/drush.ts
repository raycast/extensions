import { runShell } from "./ddev";

export function launchAndLoginProject(name: string, cwd: string): Promise<void> {
  return runShell(
    'bash -c \'set -o pipefail; url=$(ddev drush uli | grep -Eo "https?://[^[:space:]]+" | tail -n1); [ -n "$url" ] && open "$url"\'',
    cwd,
    {
      inProgress: `Opening login link for ${name}…`,
      success: `Opened login for ${name}`,
      failure: `Failed to open login for ${name}`,
    },
  );
}

export function clearCacheProject(name: string, cwd: string): Promise<void> {
  return runShell("ddev drush cr", cwd, {
    inProgress: `Clearing cache for ${name}…`,
    success: `Cleared cache for ${name}`,
    failure: `Failed to clear cache for ${name}`,
  });
}
