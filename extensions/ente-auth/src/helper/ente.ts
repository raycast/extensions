import path from "path";
import fse from "fs-extra";
import { execSync } from "child_process";

export const DEFAULT_PATH = path.join(process.env.HOME || "", "Documents", "ente");

export const createEntePath = (path: string): string => {
  if (!fse.existsSync(path)) {
    fse.mkdirSync(path);
    console.log("Ente folder created at", path);
  }

  return path;
};

export const checkEnteBinary = (): void => {
  try {
    execSync("ente version");
  } catch (error) {
    console.log("Ente binary not found. Please install it.");
  }
};

export const exportEnteAuthSecrets = (): void => {
  checkEnteBinary();

  if (!fse.existsSync(`${DEFAULT_PATH}/ente_auth.txt`)) {
    console.log("ente_auth.txt not found. Exporting...");
    execSync("ente export");

    if (!fse.existsSync(`${DEFAULT_PATH}/ente_auth.txt`)) {
      console.log("Export failed.");
      return;
    } else {
      console.log("Export successful.");
    }

    return;
  } else {
    console.log("Skipping export...");
  }

  console.log("Export found.");
  return;
};
