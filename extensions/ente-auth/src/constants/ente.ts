import { getPreferenceValues } from "@raycast/api";
import os from "os";
import path from "path";

export const DEFAULT_EXPORT_DIR_PATH = (): string => {
  const exportPath = getPreferenceValues().exportPath || path.join(process.env.HOME || "", "Documents", "ente");

  if (exportPath.startsWith("~/")) {
    return exportPath.replace("~", os.homedir());
  }

  return exportPath;
};

export const EXPORT_FILE_PATH = `${DEFAULT_EXPORT_DIR_PATH()}/ente_auth.txt`;
