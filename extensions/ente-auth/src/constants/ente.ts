import { getPreferenceValues } from "@raycast/api";
import os from "os";
import path from "path";

let cachedExportDirPath: string;
const ENTE_EXPORT_FILE_NAME = "ente_auth.txt";

const stripWrappingQuotes = (value: string): string => value.trim().replace(/^(['"])(.*)\1$/, "$2");

export const DEFAULT_EXPORT_DIR_PATH = (): string => {
	if (cachedExportDirPath) {
		return cachedExportDirPath;
	}

	const exportPath = stripWrappingQuotes(
		getPreferenceValues<Preferences>().exportPath || path.join(os.homedir(), "Documents", "ente")
	);

	cachedExportDirPath = exportPath.startsWith("~/") ? exportPath.replace("~", os.homedir()) : exportPath;

	return cachedExportDirPath;
};

export const getExportFilePath = (exportDirPath: string = DEFAULT_EXPORT_DIR_PATH()): string =>
	path.join(exportDirPath, ENTE_EXPORT_FILE_NAME);
