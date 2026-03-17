import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

export async function generateSSHKey(options: {
  name: string;
  algorithm: string;
  comment?: string;
  passphrase?: string;
}): Promise<string> {
  const { name, algorithm, comment, passphrase } = options;
  const sshDir = path.join(os.homedir(), ".ssh");
  const filePath = path.join(sshDir, name);

  const args = ["-t", algorithm, "-f", filePath, "-N", passphrase || ""];

  if (comment) {
    args.push("-C", comment);
  }

  let sshKeygenPath = "ssh-keygen"; // default
  if (algorithm.endsWith("-sk")) {
    const fs = await import("fs/promises");
    const { getPreferenceValues } = await import("@raycast/api");
    const prefs = getPreferenceValues<{ customSshKeygenPath?: string }>();

    const testPaths = [];
    if (prefs.customSshKeygenPath) {
      testPaths.push(prefs.customSshKeygenPath);
    }
    testPaths.push(
      "/opt/homebrew/opt/openssh/bin/ssh-keygen", // Apple Silicon Homebrew
      "/usr/local/opt/openssh/bin/ssh-keygen", // Intel Homebrew
    );

    for (const testPath of testPaths) {
      try {
        await fs.access(testPath);
        sshKeygenPath = testPath;
        break; // Found homebrew openssh, use it instead of system default
      } catch {
        // continue trying
      }
    }
  }

  try {
    const { stdout, stderr } = await execFileAsync(sshKeygenPath, args);
    return stdout + stderr;
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (sshKeygenPath === "ssh-keygen" && errorMessage.includes("No FIDO SecurityKeyProvider specified")) {
      throw new Error(
        "macOS built-in ssh-keygen doesn't support FIDO keys. Please run `brew install openssh` in your terminal to fix this.",
      );
    }
    if (errorMessage.includes("Key enrollment failed")) {
      if (errorMessage.includes("device not found")) {
        throw new Error("Hardware key not found. Please insert your FIDO/YubiKey into your computer and try again.");
      }
      if (errorMessage.includes("timeout") || errorMessage.includes("user presence")) {
        throw new Error("Hardware key timeout. Please make sure to touch your hardware key when making a request.");
      }
      throw new Error(`Hardware key error: ${errorMessage}`);
    }
    throw new Error(`Failed to generate key: ${errorMessage}`);
  }
}

export async function getFingerprint(filePath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("ssh-keygen", ["-lf", filePath]);
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get fingerprint: ${(error as Error).message}`);
  }
}

export async function checkIfKeyHasPassphrase(privateKeyPath: string): Promise<boolean> {
  try {
    const fs = await import("fs/promises");
    await fs.access(privateKeyPath);
  } catch {
    return false;
  }

  try {
    // -y reads private and prints public to stdout
    // -P specifies passphrase; "" means empty passphrase
    await execFileAsync("ssh-keygen", ["-y", "-f", privateKeyPath, "-P", ""]);
    // Succeeds without error -> passphrase is empty (no passphrase)
    return false;
  } catch {
    // Errors out with code 1 -> passphrase required (has passphrase)
    return true;
  }
}
