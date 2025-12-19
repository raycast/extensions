import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class KeychainAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KeychainAccessError";
  }
}

function isNotFoundError(stderr: string): boolean {
  return (
    stderr.includes("could not be found") ||
    stderr.includes("The specified item could not be found")
  );
}

async function runSecurity(
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("security", args, {
      encoding: "utf8",
    });
    return { stdout: String(stdout ?? ""), stderr: String(stderr ?? "") };
  } catch (err) {
    const e = err as {
      stdout?: string;
      stderr?: string;
      code?: number;
      message?: string;
    };
    const stderr = String(e.stderr ?? "");

    // `security` returns a non-zero exit code when an item is missing.
    if (isNotFoundError(stderr)) {
      return { stdout: String(e.stdout ?? ""), stderr };
    }

    throw new KeychainAccessError(
      `Keychain command failed: security ${args.join(" ")}\n${stderr || e.message || ""}`,
    );
  }
}

export async function getGenericPassword(
  service: string,
  account: string,
): Promise<string | undefined> {
  const { stdout, stderr } = await runSecurity([
    "find-generic-password",
    "-s",
    service,
    "-a",
    account,
    "-w",
  ]);

  if (stderr && isNotFoundError(stderr)) return undefined;
  const value = stdout.trim();
  return value.length ? value : undefined;
}

export async function setGenericPassword(
  service: string,
  account: string,
  password: string,
): Promise<void> {
  // -U updates if existing
  await runSecurity([
    "add-generic-password",
    "-s",
    service,
    "-a",
    account,
    "-w",
    password,
    "-U",
  ]);
}

export async function deleteGenericPassword(
  service: string,
  account: string,
): Promise<void> {
  const { stderr } = await runSecurity([
    "delete-generic-password",
    "-s",
    service,
    "-a",
    account,
  ]);

  // ignore not found
  void stderr;
}
