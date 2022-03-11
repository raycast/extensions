import { environment } from "@raycast/api";
import { execa } from "execa";
import { existsSync } from "fs";
import path from "path";

const binaryAsset = path.join(environment.assetsPath, "dark-mode");
const binary = path.join(environment.supportPath, "dark-mode");

async function ensureBinary() {
  if (!existsSync(binary)) {
    await execa("cp", [binaryAsset, binary]);
    await execa("chmod", ["+x", binary]);
  }
}

export const isDarkMode = async () => {
  await ensureBinary();
  const output = await execa(binary, ["status"]);
  return output.stdout === "on";
};
