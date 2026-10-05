import { environment } from "@raycast/api";
import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { invokeRaw } from "./client";
import { Dashboard } from "./dashboard";
import { executablePreferences, listExecutables, resolveExecutable, selectedExecutableSource } from "./executable";

interface InspectedFile {
	path: string;
	exists: boolean;
	modifiedAt?: string;
	json?: unknown;
	error?: string;
}

export interface DiagnosticReport {
	generatedAt: string;
	extension: {
		assetsPath: string;
		supportPath: string;
	};
	executables: {
		preferences?: Awaited<ReturnType<typeof executablePreferences>>;
		selected?: Awaited<ReturnType<typeof resolveExecutable>>;
		installations?: Awaited<ReturnType<typeof listExecutables>>;
		errors: string[];
	};
	storage: {
		supportDirectory: string;
		files: InspectedFile[];
		workspaces: InspectedFile[];
		error?: string;
	};
	cli?: CLIDiagnostics;
	dashboard?: {
		status: Dashboard["status"];
		rawStatus?: unknown;
		version?: string;
		source: Dashboard["source"];
		executablePath: string;
		issues: string[];
	};
}

export interface CLIDiagnostics {
	source?: string;
	status?: Awaited<ReturnType<typeof invokeRaw>>;
	version?: Awaited<ReturnType<typeof invokeRaw>>;
	error?: string;
}

export async function collectDirectDiagnostics(dashboard?: Dashboard): Promise<DiagnosticReport> {
	const [executables, storage] = await Promise.all([inspectExecutables(), inspectStorage()]);

	return {
		generatedAt: new Date().toISOString(),
		extension: {
			assetsPath: environment.assetsPath,
			supportPath: environment.supportPath,
		},
		executables,
		storage,
		...(dashboard
			? {
					dashboard: {
						status: dashboard.status,
						rawStatus: dashboard.rawStatus,
						version: dashboard.version,
						source: dashboard.source,
						executablePath: dashboard.executablePath,
						issues: dashboard.issues,
					},
				}
			: {}),
	};
}

export async function collectCLIDiagnostics(): Promise<CLIDiagnostics> {
	try {
		const source = await selectedExecutableSource();
		const [status, version] = await Promise.all([
			invokeRaw(["status", "--all"], source),
			invokeRaw(["version"], source),
		]);
		return {
			source,
			status,
			version,
		};
	} catch (error) {
		return { error: errorMessage(error) };
	}
}

async function inspectExecutables(): Promise<DiagnosticReport["executables"]> {
	const errors: string[] = [];
	const [preferences, selected, installations] = await Promise.allSettled([
		executablePreferences(),
		resolveExecutable(),
		listExecutables(),
	]);

	return {
		...(preferences.status === "fulfilled"
			? { preferences: preferences.value }
			: recordError(errors, "Executable preferences", preferences.reason)),
		...(selected.status === "fulfilled"
			? { selected: selected.value }
			: recordError(errors, "Selected executable", selected.reason)),
		...(installations.status === "fulfilled"
			? { installations: installations.value }
			: recordError(errors, "Executable discovery", installations.reason)),
		errors,
	};
}

async function inspectStorage(): Promise<DiagnosticReport["storage"]> {
	const supportDirectory = join(homedir(), "Library", "Application Support", "fxcodex");
	const files = await Promise.all(
		["configuration.json", "preferences.json", "runtime.json", "update-state.json", ".migration.json"].map((name) =>
			inspectJSONFile(join(supportDirectory, name)),
		),
	);
	const workspacesDirectory = join(supportDirectory, "workspaces");

	try {
		const entries = await readdir(workspacesDirectory, { withFileTypes: true });
		const workspaces = await Promise.all(
			entries
				.filter((entry) => entry.isDirectory())
				.sort((lhs, rhs) => lhs.name.localeCompare(rhs.name))
				.map((entry) => inspectJSONFile(join(workspacesDirectory, entry.name, "workspace.json"))),
		);
		return {
			supportDirectory,
			files,
			workspaces,
		};
	} catch (error) {
		return {
			supportDirectory,
			files,
			workspaces: [],
			error: errorMessage(error),
		};
	}
}

async function inspectJSONFile(path: string): Promise<InspectedFile> {
	try {
		const [contents, metadata] = await Promise.all([readFile(path, "utf8"), stat(path)]);
		try {
			return {
				path,
				exists: true,
				modifiedAt: metadata.mtime.toISOString(),
				json: JSON.parse(contents),
			};
		} catch (error) {
			return {
				path,
				exists: true,
				modifiedAt: metadata.mtime.toISOString(),
				error: `Invalid JSON: ${errorMessage(error)}`,
			};
		}
	} catch (error) {
		const code = isRecord(error) && typeof error.code === "string" ? error.code : undefined;
		return {
			path,
			exists: false,
			...(code === "ENOENT" ? {} : { error: errorMessage(error) }),
		};
	}
}

function recordError(errors: string[], label: string, error: unknown): Record<string, never> {
	errors.push(`${label}: ${errorMessage(error)}`);
	return {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
