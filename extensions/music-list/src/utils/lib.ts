import { exec, execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export async function executeWindowsCommand(command: string): Promise<string> {
  try {
    const fullCommand = `chcp 65001 > nul && ${command}`;
    const { stdout } = await execAsync(fullCommand);
    return stdout.trim();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error("Command not found. Please ensure the tool is installed and in PATH.");
    }
    throw error;
  }
}

export function parseCustomCommand(
  command: string,
  replacements: Record<string, string>
): { executable: string; args: string[] } {
  const commandParts = command.match(/"[^"]+"|\\S+/g) || [];

  if (commandParts.length === 0) {
    throw new Error("Invalid command format");
  }

  const executable = commandParts[0].replace(/"/g, "");
  const args = commandParts.slice(1).map((arg) => {
    let processedArg = arg.replace(/"/g, "");

    Object.entries(replacements).forEach(([placeholder, value]) => {
      processedArg = processedArg.replace(placeholder, value);
    });

    return processedArg;
  });

  return { executable, args };
}

export async function openInExplorer(path: string): Promise<void> {
  await executeWindowsCommand(`explorer.exe /select,"${path}"`);
}

export async function executeCustomCommand(
  command: string,
  replacements: Record<string, string>
): Promise<string> {
  const { executable, args } = parseCustomCommand(command, replacements);
  const { stdout } = await execFileAsync(executable, args);
  return stdout.trim();
}
