import { environment } from "@raycast/api";
import { join } from "path";
import { execa } from "execa";
import { chmod } from "fs/promises";

const executeCommand = async (args: string[]) => {
    const command = join(environment.assetsPath, "auth");
    await chmod(command, "755");
    return await execa(command, args);
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

export { setKeychainItem, getKeychainItem };
