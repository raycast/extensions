import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { join } from "path";
import { getComposerPath } from "./composerLocator";
import { getPhpPath } from "./phpLocator";

const execAsync = promisify(exec);

export async function runComposer(command: string, cwd: string): Promise<string> {
  if (!cwd) {
    throw new Error("Project directory is required");
  }

  const commands: string[] = [];

  try {
    const composerPath = await getComposerPath();
    commands.push(`${composerPath} ${command}`);
  } catch {
    // ignore, try local fallbacks
  }

  const localPhar = join(cwd, "composer.phar");
  if (existsSync(localPhar)) {
    const php = await getPhpPath();
    commands.push(`${php} ${localPhar} ${command}`);
  }

  const vendorComposer = join(cwd, "vendor", "bin", "composer");
  if (existsSync(vendorComposer)) {
    const php = await getPhpPath();
    commands.push(`${php} ${vendorComposer} ${command}`);
  }

  let lastError: Error | undefined;
  for (const cmd of commands) {
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd });
      if (stderr && stderr.trim()) {
        console.warn("Composer stderr:", stderr);
      }
      return stdout;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("Composer not found. Please install Composer or ensure it's in your PATH.");
}
