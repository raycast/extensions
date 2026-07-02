import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const SECURITY_BIN = "/usr/bin/security";

export async function readKeychainPassword(service: string, account: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(SECURITY_BIN, ["find-generic-password", "-s", service, "-a", account, "-w"]);
    return stdout.trim();
  } catch {
    return "";
  }
}

export async function writeKeychainPassword(service: string, account: string, password: string): Promise<void> {
  if (!password) {
    try {
      await execFileAsync(SECURITY_BIN, ["delete-generic-password", "-s", service, "-a", account]);
    } catch {
      // The key may not exist yet.
    }
    return;
  }

  await execFileAsync(SECURITY_BIN, ["add-generic-password", "-s", service, "-a", account, "-w", password, "-U"]);
}
