import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 1024 * 1024 * 10;

type CommandError = Error & {
  stdout?: string | Buffer;
  stderr?: string | Buffer;
};

interface RunWingetCommandOptions {
  retries?: number;
  retryDelayMs?: number;
}

function formatArg(arg: string): string {
  return /\s/.test(arg) ? `"${arg}"` : arg;
}

function formatCommand(args: string[]): string {
  return `winget ${args.map(formatArg).join(" ")}`;
}

function outputToString(output: string | Buffer | undefined): string {
  return typeof output === "string" ? output : (output?.toString("utf-8") ?? "");
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const stderr = outputToString((error as CommandError).stderr).trim();
    return stderr || error.message;
  }

  return String(error);
}

export async function runWingetCommand(args: string[], options: RunWingetCommandOptions = {}): Promise<string> {
  const { retries = 0, retryDelayMs = 1000 } = options;
  const command = formatCommand(args);

  console.log(`[winget] Running: ${command}`);
  try {
    const { stdout, stderr } = await execFileAsync("winget", args, {
      encoding: "utf-8",
      maxBuffer: MAX_BUFFER,
      windowsHide: true,
    });

    console.log(`[winget] stdout length: ${stdout?.length}`);
    console.log(`[winget] stderr: ${stderr}`);
    console.log(`[winget] stdout first 500 chars: ${stdout?.substring(0, 500)}`);
    return stdout;
  } catch (error: unknown) {
    console.log("[winget] Error:", error);

    const stdout = outputToString((error as CommandError).stdout);
    if (stdout.trim().length > 0) {
      console.log(`[winget] Error but has stdout, length: ${stdout.length}`);
      return stdout;
    }

    if (retries > 0) {
      console.log(`[winget] Retrying command, attempts left: ${retries}`);
      await delay(retryDelayMs);
      return runWingetCommand(args, { retries: retries - 1, retryDelayMs });
    }

    throw new Error(getErrorMessage(error));
  }
}
