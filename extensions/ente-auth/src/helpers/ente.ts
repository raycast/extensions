import { getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";
import fse from "fs-extra";
import { EXPORT_FILE_PATH } from "../constants/ente";

const DEFAULT_CLI_PATH = getPreferenceValues().cliPath || "/usr/local/bin/ente";

export const createEntePath = (path: string): string => {
  if (!fse.existsSync(path)) {
    fse.mkdirSync(path, { recursive: true });
    console.log("Ente folder created at", path);
  } else {
    console.log("Ente folder already exists at", path);
  }

  return path;
};

export const checkEnteBinary = (): boolean => {
  try {
    execSync(`${DEFAULT_CLI_PATH} version`);
    return true;
  } catch (error) {
    console.log("Ente binary not found. Please install it.");
    return false;
  }
};

export const exportEnteAuthSecrets = (): boolean => {
  try {
    fse.removeSync(EXPORT_FILE_PATH);
  } catch (error) {
    console.error("Error during removal:", error);
  }

  try {
    execSync(`${DEFAULT_CLI_PATH} export`);
  } catch (error) {
    throw new Error("Export failed. Please check if the command is correct.");
  }
  return true;
};

export const deleteEnteExport = (): boolean => {
  try {
    fse.removeSync(EXPORT_FILE_PATH);
  } catch (error) {
    console.error("Error during removal:", error);
    return false;
  }

  return true;
};
