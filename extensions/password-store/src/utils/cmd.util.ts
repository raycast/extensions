import { getPreferenceValues } from "@raycast/api";
import { exec, execFile, spawn } from "child_process";
import { promisify } from "node:util";

/** Executes `pass` executable directly. Uses `spawn` when stdin input is needed, `execFile` otherwise. */
export const runPassCmd = async (args: string[], input?: string): Promise<string> => {
  const preferences = getPreferenceValues();
  const paths = [...(preferences.ADDITIONAL_PATH?.split(":") || []), "/opt/homebrew/bin"].filter(Boolean).join(":");
  const env = {
    ...process.env,
    PATH: `/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH}:${paths}`,
  };

  if (input !== undefined) {
    return new Promise((resolve, reject) => {
      const child = spawn("pass", args, { env });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (data: Buffer) => (stdout += data.toString()));
      child.stderr.on("data", (data: Buffer) => (stderr += data.toString()));
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve(stdout);
        else reject(new Error(`pass exited with code ${code}: ${stderr}`));
      });
      child.stdin.write(input);
      child.stdin.end();
    });
  }

  try {
    const execFileAsync = promisify(execFile);
    const { stdout } = await execFileAsync("pass", args, { env });
    return stdout;
  } catch (error) {
    console.error("Error executing command:", error);
    throw error;
  }
};

/**
 * Basic validation for user-controlled pass paths/arguments.
 * Rejects arguments that look like options, contain path traversal, nulls or newlines.
 */
export const validatePassArg = (arg: string): void => {
  if (!arg || typeof arg !== "string") {
    throw new Error("Invalid argument: empty");
  }

  if (arg.includes("\0") || arg.includes("\n") || arg.includes("\r")) {
    throw new Error("Invalid characters in argument");
  }

  // Disallow path traversal segments
  const segments = arg.split("/");
  if (segments.includes("..")) {
    throw new Error("Path traversal is not allowed");
  }

  // Disallow arguments that start with '-' which would be interpreted as options
  if (arg.trim().startsWith("-")) {
    throw new Error("Arguments starting with '-' are not allowed");
  }

  // Disallow absolute paths to avoid writing outside the password store
  if (arg.startsWith("/")) {
    throw new Error("Absolute paths are not allowed");
  }
};
/**
 * Executes a shell command and returns the standard output.
 *
 * @param {string} cmd - The command to execute.
 * @returns {Promise<string>} A promise that resolves to the standard output of the executed command.
 */
export const runCmd = async (cmd: string): Promise<string> => {
  try {
    const execPromise = promisify(exec);
    const preferences = getPreferenceValues();

    // Needed for the 'pass' command to work on M1 Mac
    const paths = [...(preferences.ADDITIONAL_PATH?.split(":") || []), "/opt/homebrew/bin"].filter(Boolean).join(":");
    const shellPrefix = `export PATH=$PATH:${paths} &&`;

    // Execute the command and wait for the result
    const { stdout } = await execPromise(`${shellPrefix} ${cmd}`, { shell: "/bin/zsh" });

    // Return the standard output
    return stdout;
  } catch (error) {
    // Log the error and rethrow it
    console.error("Error executing command:", error);
    throw error;
  }
};
