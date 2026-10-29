import { showFailureToast } from "@raycast/utils";
import { execSync } from "child_process";

/**
 * Pager and editor variables are only useful in an interactive terminal, which Git never has here.
 * simple-git refuses to run any command while one of them is set (allowUnsafePager / allowUnsafeEditor),
 * even to a harmless value, so they are removed instead of overridden.
 */
const INTERACTIVE_ONLY_VARIABLES = new Set(["PAGER", "GIT_PAGER", "EDITOR", "GIT_EDITOR", "GIT_SEQUENCE_EDITOR"]);

function withoutInteractiveOnlyVariables(environment: { [key: string]: string }): { [key: string]: string } {
  return Object.fromEntries(
    Object.entries(environment).filter(([key]) => !INTERACTIVE_ONLY_VARIABLES.has(key.trim().toUpperCase())),
  );
}

/**
 * Cached environment variables for Git operations.
 */
export const shellEnvironmentVariables: { [key: string]: string } = (() => {
  try {
    // Load all user environment variables from the current shell in interactive mode with triggering cd hook, to correctly simulate startup (for mise, asdf, dotenv, etc.)
    const userEnvironment = execSync(`/bin/zsh -l -i -c 'cd . &> /dev/null; /usr/bin/env -0'`)
      .toString()
      .trim()
      .split("\0")
      .map((envVar) => {
        const indexEqualSign = envVar.indexOf("=");
        if (indexEqualSign === -1) {
          return null;
        }
        return [envVar.slice(0, indexEqualSign), envVar.slice(indexEqualSign + 1)];
      })
      .filter((envVar) => envVar !== null)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as { [key: string]: string });

    // Load SSH socket from launchctl to access the system ssh-agent with already set up SSH keys.
    const SSH_AUTH_SOCK_VALUE = execSync(`launchctl getenv SSH_AUTH_SOCK`).toString().trim();

    return withoutInteractiveOnlyVariables({
      ...userEnvironment,
      SSH_AUTH_SOCK: SSH_AUTH_SOCK_VALUE,
    });
  } catch (error) {
    showFailureToast(error, { title: "Failed to load ZSH-shell environment variables" });
    return withoutInteractiveOnlyVariables({ ...process.env } as { [key: string]: string });
  }
})();
