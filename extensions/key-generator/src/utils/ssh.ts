import { execFile, spawn } from "child_process";
import { getPreferenceValues } from "@raycast/api";
import { constants } from "fs";
import fs from "fs/promises";
import { promisify } from "util";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

function execFileWithInput(command: string, args: string[], input: string, env?: NodeJS.ProcessEnv) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { env });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => reject(error));

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const error = new Error(stderr.trim() || `Command failed with exit code ${code}`) as Error & {
        code?: number | null;
        stdout?: string;
        stderr?: string;
      };
      error.code = code;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

export async function changeKeyPassphrase(privateKeyPath: string, currentPassphrase: string, newPassphrase: string) {
  await execFileWithInput(
    "ssh-keygen",
    ["-p", "-f", privateKeyPath, "-P", currentPassphrase],
    `${newPassphrase}\n${newPassphrase}\n`,
  );
}

export async function generateSSHKey(options: {
  name: string;
  algorithm: string;
  comment?: string;
  passphrase?: string;
}): Promise<string> {
  const { name, algorithm, comment, passphrase } = options;
  const sshDir = path.join(os.homedir(), ".ssh");
  const filePath = path.join(sshDir, name);

  await fs.mkdir(sshDir, { recursive: true });

  const args = ["-t", algorithm, "-f", filePath];

  if (comment) {
    args.push("-C", comment);
  }

  let sshKeygenPath = "ssh-keygen"; // default
  if (algorithm.endsWith("-sk")) {
    const prefs = getPreferenceValues<Preferences>();

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
    const { stdout, stderr } = await execFileWithInput(
      sshKeygenPath,
      args,
      `${passphrase || ""}\n${passphrase || ""}\n`,
    );
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
    await fs.access(privateKeyPath, constants.R_OK);
  } catch {
    return false;
  }

  try {
    // -y reads private and prints public to stdout
    // -P specifies passphrase; "" means empty passphrase
    await execFileAsync("ssh-keygen", ["-y", "-f", privateKeyPath, "-P", ""]);
    // Succeeds without error -> passphrase is empty (no passphrase)
    return false;
  } catch (error) {
    const errorText =
      `${(error as Error & { stderr?: string }).message} ${(error as Error & { stderr?: string }).stderr || ""}`.toLowerCase();

    if (errorText.includes("passphrase")) {
      return true;
    }

    return false;
  }
}
