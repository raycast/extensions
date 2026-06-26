import { runShell } from "./ddev";

export function launchAndLoginProject(name: string, cwd: string): Promise<void> {
  return runShell("ddev drush uli | xargs open", cwd, {
    inProgress: `Opening login link for ${name}…`,
    success: `Opened login for ${name}`,
    failure: `Failed to open login for ${name}`,
  });
}
