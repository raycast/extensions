import { showFailureToast } from "@raycast/utils";
import { execSync } from "child_process";

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
      .map((value) => value.split("="))
      .reduce(
        (acc, [key, value]) => {
          acc[key] = value;
          return acc;
        },
        {} as { [key: string]: string },
      );

    // Load SSH socket from launchctl to access the system ssh-agent with already set up SSH keys.
    const SSH_AUTH_SOCK_VALUE = execSync(`launchctl getenv SSH_AUTH_SOCK`).toString().trim();

    return {
      ...userEnvironment,
      SSH_AUTH_SOCK: SSH_AUTH_SOCK_VALUE,
    } as { [key: string]: string };
  } catch (error) {
    showFailureToast(error, { title: "Failed to load ZSH-shell environment variables" });
    return { ...process.env } as { [key: string]: string };
  }
})();
