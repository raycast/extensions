import { environment } from "@raycast/api";
import { spawnSync } from "child_process";
import fs from "fs";

const binary = `${environment.assetsPath}/lang`;

export default async function detect(text: string): Promise<string> {
  try {
    await fs.promises.access(binary, fs.constants.X_OK);
  } catch {
    await fs.promises.chmod(binary, 0o775);
  }
  const { status, stdout, stderr } = spawnSync(binary, [text]);
  if (status != 0) {
    throw new Error(stderr.toString());
  } else {
    return stdout.toString();
  }
}
