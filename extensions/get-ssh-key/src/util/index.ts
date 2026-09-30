import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export const getSSHKeys = async () => {
  const home = homedir();
  const sshKeyRootDir = path.join(home, ".ssh");
  const publicKeys = (await readdir(sshKeyRootDir)).filter((file) => file.endsWith(".pub"));
  const result = publicKeys.map((key) => ({
    title: key,
    path: path.join(sshKeyRootDir, key),
    readFile: () => readFileSync(path.join(sshKeyRootDir, key), "utf8"),
  }));
  return result;
};
