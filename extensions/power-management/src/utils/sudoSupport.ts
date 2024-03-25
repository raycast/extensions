import { existsSync, readFileSync } from "fs";

/**
 * Test whether we should use `sudo` since it supports touch ID
 */
export function sudoSupportsTouchId(): boolean {
  const pattern = /^auth\s+sufficient\s+pam_tid\.so$/m;
  const targetFile = existsSync("/etc/pam.d/sudo_local") ? "/etc/pam.d/sudo_local" : "/etc/pam.d/sudo";

  return pattern.test(readFileSync(targetFile).toString());
}
