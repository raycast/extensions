import { spawn } from "node:child_process";

export type CommandResult = {
  code: number;
  stdout: string;
  stderr: string;
  error?: Error;
};

export type CommandExecutor = (
  command: string,
  args: string[],
  input?: string,
) => Promise<CommandResult>;

const FALLBACK_GSED_BINARIES = [
  "gsed",
  "/opt/homebrew/bin/gsed",
  "/usr/local/bin/gsed",
  "/opt/homebrew/opt/gnu-sed/libexec/gnubin/sed",
  "/usr/local/opt/gnu-sed/libexec/gnubin/sed",
];

let cachedGsedBinary: string | null | undefined;

export async function executeCommand(
  command: string,
  args: string[],
  input = "",
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "pipe" });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({ code: 127, stdout, stderr: stderr || error.message, error });
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

export async function checkGsedAvailability(
  executor: CommandExecutor = executeCommand,
): Promise<boolean> {
  const binary = await resolveGsedBinary(executor);
  return Boolean(binary);
}

export async function runGsedSubstitution(
  sedExpression: string,
  input: string,
  executor: CommandExecutor = executeCommand,
): Promise<string> {
  const gsedBinary = await resolveGsedBinary(executor);
  if (!gsedBinary) {
    throw new Error(
      "GNU sed is not available. Install it with: brew install gnu-sed",
    );
  }

  const result = await executor(gsedBinary, ["-e", sedExpression], input);

  if (result.code !== 0) {
    const message = result.stderr.trim() || "gsed execution failed";
    throw new Error(message);
  }

  return result.stdout;
}

async function resolveGsedBinary(
  executor: CommandExecutor = executeCommand,
): Promise<string | null> {
  if (executor === executeCommand && cachedGsedBinary !== undefined) {
    return cachedGsedBinary;
  }

  const candidates = new Set<string>([
    process.env.GSED_PATH ?? "",
    process.env.HOMEBREW_PREFIX
      ? `${process.env.HOMEBREW_PREFIX}/bin/gsed`
      : "",
    ...FALLBACK_GSED_BINARIES,
  ]);

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const result = await executor(candidate, ["--version"]);
    if (result.code === 0) {
      if (executor === executeCommand) {
        cachedGsedBinary = candidate;
      }
      return candidate;
    }
  }

  if (executor === executeCommand) {
    cachedGsedBinary = null;
  }
  return null;
}
