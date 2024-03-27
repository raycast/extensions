import { environment } from "@raycast/api";
import { execa } from "execa";
import { chmod } from "fs/promises";
import { join } from "path";

const CLI_PATH = join(environment.assetsPath, "auth");

const executeCommand = async (args: string[]) => {
  await chmod(CLI_PATH, "755");
  return await execa(CLI_PATH, args);
};

const setKeychainItem = async (key: string, secret: string) => {
  const { stderr } = await executeCommand(["set", key, secret]);
  if (stderr) {
    throw new Error(stderr);
  }
};

const getKeychainItem = async (key: string): Promise<string | null> => {
  const { stdout, stderr } = await executeCommand(["get", key]);
  if (stderr) {
    return null;
  }
  return stdout.trim();
};

export { getKeychainItem, setKeychainItem };
