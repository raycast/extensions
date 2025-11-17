import { getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";
import fse from "fs-extra";
import { DEFAULT_EXPORT_DIR_PATH, EXPORT_FILE_PATH } from "../constants/ente";

const DEFAULT_CLI_PATH = getPreferenceValues().cliPath || "/usr/local/bin/ente";

export const checkEnteExportDirValue = (): boolean => {
	const accountList = execSync(`${DEFAULT_CLI_PATH} account list`).toString();
	const exportDirMatch = accountList.match(/^ExportDir:\s*(.*)$/m);

	if (!exportDirMatch) {
		throw new Error("ExportDir not found in account list output.");
	}

	const enteExportDir = exportDirMatch[1].trim();
	const expectedExportDir = DEFAULT_EXPORT_DIR_PATH().trim();

	if (enteExportDir !== expectedExportDir) {
		throw new Error(`Export path mismatch.\nExpected: ${expectedExportDir}\nFound:    ${enteExportDir}`);
	}

	return true;
};

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
		console.error("Ente binary not found. Please install it.", error);
	}
	return false;
};

export const exportEnteAuthSecrets = (): boolean => {
	try {
		fse.removeSync(EXPORT_FILE_PATH);
		console.log("Export file removed");
	} catch (error) {
		console.error("Error during removal:", error);
	}

	try {
		execSync(`${DEFAULT_CLI_PATH} export`);
		console.log("Export to", EXPORT_FILE_PATH);
	} catch {
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
