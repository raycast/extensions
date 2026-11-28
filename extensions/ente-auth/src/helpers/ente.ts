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

// ---------------------------------------------------------------------------
// CLI version detection
// ---------------------------------------------------------------------------

// Ente CLI 0.4 is a rewrite with a different command set, so we pick the code path by version.
// - <= 0.3 (Go):   `ente version`   -> "Version v0.3.0"  (no `--version` flag)
// - >= 0.4 (Rust): `ente --version` -> "ente 0.4.5"      (no `version` subcommand)
const MODERN_CLI_MIN_VERSION: [number, number] = [0, 4];

export const parseEnteCliVersion = (output: string): [number, number, number] | null => {
	const match = output.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
	return match ? [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)] : null;
};

const readEnteCliVersion = (): string | null => {
	for (const args of [["--version"], ["version"]]) {
		try {
			return runEnteCommand(...args);
		} catch {
			// Try the other form; each CLI generation only supports one of them.
		}
	}
	return null;
};

export const isModernEnteCli = (): boolean => {
	const versionOutput = readEnteCliVersion();
	const version = versionOutput ? parseEnteCliVersion(versionOutput) : null;
	// If the version can't be determined, assume the current CLI.
	if (!version) {
		return true;
	}
	const [major, minor] = version;
	const [minMajor, minMinor] = MODERN_CLI_MIN_VERSION;
	return major > minMajor || (major === minMajor && minor >= minMinor);
};

// ---------------------------------------------------------------------------
// Ente CLI 0.4+ (modern)
// ---------------------------------------------------------------------------

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

const exportEnteAuthSecretsModern = (exportDirPath: string): boolean => {
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

// ---------------------------------------------------------------------------
// Ente CLI < 0.4 (legacy)
// ---------------------------------------------------------------------------

type LegacyEnteAccount = {
	email?: string;
	app?: string;
	exportDir?: string;
};

const parseLegacyEnteAccounts = (accountList: string): LegacyEnteAccount[] => {
	const accounts: LegacyEnteAccount[] = [];
	let currentAccount: LegacyEnteAccount = {};

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

const normalizeDirectoryPath = (directoryPath: string): string => {
	const normalizedPath = normalizeConfiguredPath(directoryPath);
	return process.platform === "win32" ? normalizedPath.toLowerCase() : normalizedPath;
};

export const syncEnteExportDirValue = (expectedExportDir: string = DEFAULT_EXPORT_DIR_PATH()): string => {
	const accountList = runEnteCommand("account", "list");
	const accounts = parseLegacyEnteAccounts(accountList);
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

const exportEnteAuthSecretsLegacy = (exportDirPath: string): boolean => {
	try {
		syncEnteExportDirValue(exportDirPath);
		runEnteCommand("export");
		console.log("Export to", getExportFilePath(exportDirPath));
	} catch {
		throw new Error("Export failed. Please check if the command is correct.");
	}
	return true;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
	if (readEnteCliVersion() !== null) {
		return true;
	}
	console.error("Ente binary not found. Please install it.");
	return false;
};

export const exportEnteAuthSecrets = (exportDirPath: string = DEFAULT_EXPORT_DIR_PATH()): boolean =>
	isModernEnteCli() ? exportEnteAuthSecretsModern(exportDirPath) : exportEnteAuthSecretsLegacy(exportDirPath);

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
