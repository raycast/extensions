import { getPreferenceValues, trash } from "@raycast/api";
import { execFileSync } from "child_process";
import fse from "fs-extra";
import { DEFAULT_EXPORT_DIR_PATH, getExportFilePath } from "../constants/ente";

const normalizeConfiguredPath = (configuredPath: string): string => {
	const trimmedPath = configuredPath.trim().replace(/^(['"])(.*)\1$/, "$2");
	return trimmedPath.startsWith("~/")
		? trimmedPath.replace("~", process.env.HOME || process.env.USERPROFILE || "~")
		: trimmedPath;
};

const getCliPath = (): string =>
	normalizeConfiguredPath(getPreferenceValues<Preferences>().cliPath || "/usr/local/bin/ente");

const runEnteCommand = (...args: string[]): string =>
	execFileSync(getCliPath(), args, {
		encoding: "utf8",
		windowsHide: true,
	});

type EnteAccount = {
	email?: string;
	app?: string;
	exportDir?: string;
};

const parseEnteAccounts = (accountList: string): EnteAccount[] => {
	const accounts: EnteAccount[] = [];
	let currentAccount: EnteAccount = {};

	for (const line of accountList.split(/\r?\n/)) {
		const trimmedLine = line.trim();

		if (!trimmedLine || trimmedLine.startsWith("Configured accounts:")) {
			continue;
		}

		if (/^=+$/.test(trimmedLine)) {
			if (currentAccount.exportDir || currentAccount.app) {
				accounts.push(currentAccount);
				currentAccount = {};
			}
			continue;
		}

		const match = trimmedLine.match(/^([A-Za-z]+):\s*(.*)$/);
		if (!match) {
			continue;
		}

		const [, key, value] = match;
		if (key === "Email") {
			currentAccount.email = value.trim();
		}
		if (key === "App") {
			currentAccount.app = value.trim().toLowerCase();
		}
		if (key === "ExportDir") {
			currentAccount.exportDir = value.trim();
		}
	}

	if (currentAccount.exportDir || currentAccount.app) {
		accounts.push(currentAccount);
	}

	return accounts;
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
		runEnteCommand("version");
		return true;
	} catch (error) {
		console.error("Ente binary not found. Please install it.", error);
	}
	return false;
};

const normalizeDirectoryPath = (directoryPath: string): string => {
	const normalizedPath = normalizeConfiguredPath(directoryPath);
	return process.platform === "win32" ? normalizedPath.toLowerCase() : normalizedPath;
};

export const syncEnteExportDirValue = (expectedExportDir: string = DEFAULT_EXPORT_DIR_PATH()): string => {
	const accountList = runEnteCommand("account", "list");
	const accounts = parseEnteAccounts(accountList);
	const authAccount = accounts.find((account) => account.app === "auth");

	if (!authAccount?.email) {
		throw new Error(
			"Auth account not found in Ente CLI. Please run `ente account add` and choose the auth app."
		);
	}

	if (
		authAccount.exportDir &&
		normalizeDirectoryPath(authAccount.exportDir) === normalizeDirectoryPath(expectedExportDir)
	) {
		return expectedExportDir;
	}

	runEnteCommand(
		"account",
		"update",
		"--app",
		"auth",
		"--email",
		authAccount.email,
		"--dir",
		expectedExportDir
	);
	return expectedExportDir;
};

export const exportEnteAuthSecrets = (exportDirPath: string = DEFAULT_EXPORT_DIR_PATH()): boolean => {
	try {
		syncEnteExportDirValue(exportDirPath);
		runEnteCommand("export");
		console.log("Export to", getExportFilePath(exportDirPath));
	} catch {
		throw new Error("Export failed. Please check if the command is correct.");
	}
	return true;
};

export const deleteEnteExport = async (
	exportFilePath: string = getExportFilePath(DEFAULT_EXPORT_DIR_PATH())
): Promise<boolean> => {
	try {
		await trash(exportFilePath);
	} catch (error) {
		console.error("Error during removal:", error);
		return false;
	}

	return true;
};
