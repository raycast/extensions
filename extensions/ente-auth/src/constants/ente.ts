import path from "path";
import { getPreferenceValues } from "@raycast/api";

export const DEFAULT_EXPORT_PATH =
  getPreferenceValues().exportPath || path.join(process.env.HOME || "", "Documents", "ente");

export const EXPORTPATH = getPreferenceValues().exportPath || `${DEFAULT_EXPORT_PATH}/ente_auth.txt`;
