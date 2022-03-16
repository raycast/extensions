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

let lastKnownMode = false;
export const isDarkMode = async () => {
  await ensureBinary();
  try {
    const output = await execa(binary, ["status"]);
    lastKnownMode = output.stdout === "on";
    return lastKnownMode;
  } catch (err) {
    return lastKnownMode;
  }
};
