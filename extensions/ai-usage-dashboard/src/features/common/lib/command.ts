import path from "node:path";

export type CcusageResult = {
  command: string;
  stdout: string;
};

export type CcusageCommandError = Error & {
  command?: string;
  stderr?: string;
};

export type PackageInvocation = {
  file: string;
  args: string[];
  commandText: string;
};

export const createPackageInvocation = (
  packageName: string,
  args: string[],
): PackageInvocation => {
  const extensionRoot =
    process.env.VITEST_WORKER_ID === undefined ? __dirname : process.cwd();
  const cliEntrypoint = path.join(
    extensionRoot,
    "assets",
    ".generated",
    "ccusage-cli",
    packageName,
    "dist",
    "index.js",
  );

  return {
    file: process.execPath,
    args: [cliEntrypoint, ...args],
    commandText: `${packageName} ${args.join(" ")}`,
  };
};

export const normalizeCommandError = (
  commandText: string,
  error: unknown,
): CcusageCommandError => {
  const commandError = new Error(
    `Failed to run ${commandText}`,
  ) as CcusageCommandError;
  commandError.command = commandText;

  const stderr =
    error &&
    typeof error === "object" &&
    "stderr" in error &&
    typeof error.stderr === "string" &&
    error.stderr.trim().length > 0
      ? error.stderr
      : undefined;

  commandError.stderr =
    stderr ??
    (error instanceof Error ? error.message : "Unknown command error");

  return commandError;
};
