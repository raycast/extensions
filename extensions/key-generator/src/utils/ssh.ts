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

  try {
    const { stdout, stderr } = await execFileAsync("ssh-keygen", args);
    return stdout + stderr;
  } catch (error) {
    throw new Error(`Failed to generate key: ${(error as Error).message}`);
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
