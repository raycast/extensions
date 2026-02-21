import { execa } from "execa";
import { join } from "path";
import { environment } from "@raycast/api";
import { access, chmod } from "fs/promises";

let permissionsSet = false;

const executeCommand = async (args: string[]) => {
  const command = join(environment.assetsPath, "keyboard");

  if (!permissionsSet) {
    try {
      await access(command);
    } catch {
      throw new Error(
        "Keyboard helper binary not found. Please rebuild with 'pnpm run build:native'.",
      );
    }
    await chmod(command, "755");
    permissionsSet = true;
  }

  try {
    return await execa(command, args);
  } catch (error: unknown) {
    const stderr = (error as { stderr?: string }).stderr;
    if (stderr) {
      throw new Error(stderr.trim());
    }
    throw error;
  }
};

export async function getKeyboardBrightness() {
  const { stdout } = await executeCommand(["get"]);

  const parsed: unknown = JSON.parse(stdout);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("brightness" in parsed) ||
    typeof (parsed as Record<string, unknown>).brightness !== "number"
  ) {
    throw new Error(`Unexpected brightness response: ${stdout.slice(0, 200)}`);
  }

  return (parsed as { brightness: number }).brightness;
}

export async function setKeyboardBrightness(value: number) {
  await executeCommand(["set", String(value)]);
}
