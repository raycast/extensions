import { getPreferenceValues } from "@raycast/api";
import os from "os";
import path from "path";

let cachedExportDirPath: string;

export const DEFAULT_EXPORT_DIR_PATH = (): string => {
	if (cachedExportDirPath) {
		return cachedExportDirPath;
	}

	const exportPath = getPreferenceValues().exportPath || path.join(os.homedir(), "Documents", "ente");

	cachedExportDirPath = exportPath.startsWith("~/") ? exportPath.replace("~", os.homedir()) : exportPath;

	return cachedExportDirPath;
};

export const EXPORT_FILE_PATH = `${DEFAULT_EXPORT_DIR_PATH()}/ente_auth.txt`;
