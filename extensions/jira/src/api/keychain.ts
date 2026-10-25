import { execFile, type ExecFileException } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Exit status of `security find-generic-password` when no item matches.
const KEYCHAIN_ITEM_NOT_FOUND = 44;

let keychainToken: { service: string; token: Promise<string> } | null = null;

/**
 * Reads the API token from a macOS Keychain generic password item with the given service name.
 * The result is cached per service for the command's lifetime, so concurrent requests run
 * `security` once. A failed read is not cached, so the next attempt retries after the item is fixed.
 */
export function getKeychainToken(service: string): Promise<string> {
  if (process.platform !== "darwin") {
    return Promise.reject(
      new Error("Keychain Service Name is only supported on macOS. Clear it and set the API Token instead."),
    );
  }

  if (keychainToken?.service !== service) {
    const token = execFileAsync("/usr/bin/security", ["find-generic-password", "-s", service, "-w"]).then(
      ({ stdout }) => {
        const value = stdout.trim();
        if (!value) {
          throw new Error(`Keychain item "${service}" is empty.`);
        }
        return value;
      },
      (error: ExecFileException & { stderr?: string }) => {
        throw new Error(
          error.code === KEYCHAIN_ITEM_NOT_FOUND
            ? `Keychain item "${service}" not found. Create it with \`security add-generic-password -a "$USER" -s ${service} -w\` or fix the Keychain Service Name preference.`
            : `Reading the Jira API token from Keychain item "${service}" failed: ${error.stderr?.trim() || error.message}`,
        );
      },
    );
    token.catch(() => {
      if (keychainToken?.token === token) {
        keychainToken = null;
      }
    });
    keychainToken = { service, token };
  }

  return keychainToken.token;
}
