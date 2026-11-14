import { getPreferenceValues, trash } from "@raycast/api";
import { execFileSync } from "child_process";
import fse from "fs-extra";
import path from "path";
import { DEFAULT_EXPORT_DIR_PATH, getExportFilePath } from "../constants/ente";

const normalizeConfiguredPath = (configuredPath: string): string => {
	const trimmedPath = configuredPath.trim().replace(/^(['"])(.*)\1$/, "$2");
	return trimmedPath.startsWith("~/")
		? trimmedPath.replace("~", process.env.HOME || process.env.USERPROFILE || "~")
		: trimmedPath;
};

const getCliPath = (): string => {
	const configuredPath = normalizeConfiguredPath(
		getPreferenceValues<Preferences>().cliPath || "/usr/local/bin/ente"
	);

	// Tolerate the common mistake of pointing at the containing directory (e.g. "/opt/homebrew/bin")
	// instead of the binary itself by appending the expected executable name.
	try {
		if (fse.existsSync(configuredPath) && fse.statSync(configuredPath).isDirectory()) {
			return path.join(configuredPath, process.platform === "win32" ? "ente.exe" : "ente");
		}
	} catch {
		// Ignore stat errors and fall back to the configured path as-is.
	}

	return configuredPath;
};

const runEnteCommand = (...args: string[]): string =>
	execFileSync(getCliPath(), args, {
		encoding: "utf8",
		windowsHide: true,
	});

type EnteAccount = {
	name?: string;
	email?: string;
	apps?: string[];
};

// Newer Ente CLIs (0.4+) print `account list` as a table, so ask for JSON instead.
const getAuthAccount = (): EnteAccount => {
	const accounts: EnteAccount[] = JSON.parse(runEnteCommand("account", "list", "--json"));
	const authAccount = accounts.find((account) => account.apps?.includes("auth"));

	if (!authAccount?.email) {
		throw new Error(
			"Auth account not found in Ente CLI. Please run `ente account login` and choose the auth app."
		);
	}

	return authAccount;
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
		runEnteCommand("--version");
		return true;
	} catch (error) {
		console.error("Ente binary not found. Please install it.", error);
	}
	return false;
};

export const exportEnteAuthSecrets = (exportDirPath: string = DEFAULT_EXPORT_DIR_PATH()): boolean => {
	const exportFilePath = getExportFilePath(exportDirPath);
	// Export to a temporary file first, so a failed export never removes the previous one.
	const tempFilePath = `${exportFilePath}.tmp`;

	try {
		const authAccount = getAuthAccount();

		// The CLI refuses to overwrite an existing file, so clear any leftover temporary file first.
		fse.removeSync(tempFilePath);

		runEnteCommand(
			"auth",
			"export",
			"--plaintext",
			"--no-input",
			"--output",
			tempFilePath,
			"--account",
			authAccount.email as string
		);

		// Replace the previous export only after the new one has been written successfully.
		fse.moveSync(tempFilePath, exportFilePath, { overwrite: true });
		console.log("Export to", exportFilePath);
	} catch (error) {
		fse.removeSync(tempFilePath);
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(`Export failed. ${reason}`);
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
