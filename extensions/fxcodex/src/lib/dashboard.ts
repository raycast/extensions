import { invoke } from "./client";
import { resolveExecutable, selectedExecutableSource, userExecutablePath } from "./executable";
import {
	ApplicationStatus,
	AutoUpdatePolicy,
	ExecutableSource,
	FXCodexPreferences,
	PartialFXCodexStatus,
	ScriptCommandStatus,
	Workspace,
	WorkspaceStatus,
} from "./models";
import { loadWorkspaceIcons, WorkspaceIcon } from "./workspace-icons";

export interface Dashboard {
	status: PartialFXCodexStatus;
	rawStatus?: unknown;
	version?: string;
	source: ExecutableSource;
	executablePath: string;
	workspaceIcons: Record<string, WorkspaceIcon>;
	issues: string[];
}

export async function loadDashboard(): Promise<Dashboard> {
	const issues: string[] = [];
	let source: ExecutableSource = userExecutablePath();

	try {
		source = await selectedExecutableSource();
	} catch (error) {
		issues.push(`Executable preference: ${errorMessage(error)}`);
	}

	let executablePath = source;
	try {
		executablePath = (await resolveExecutable(source)).path;
	} catch (error) {
		issues.push(`Executable discovery: ${errorMessage(error)}`);
	}

	const [statusResult, versionResult] = await Promise.allSettled([
		invoke<unknown>(["status", "--all"], source),
		invoke<unknown>(["version"], source),
	]);

	let status: PartialFXCodexStatus = {};
	let rawStatus: unknown;
	if (statusResult.status === "fulfilled") {
		rawStatus = statusResult.value.data;
		status = parseStatus(rawStatus, issues);
		issues.push(...statusResult.value.warnings.map((warning) => `CLI warning: ${warning.message}`));
	} else {
		issues.push(`CLI status: ${errorMessage(statusResult.reason)}`);
	}

	let version: string | undefined;
	if (versionResult.status === "fulfilled") {
		const value = versionResult.value.data;
		if (isRecord(value) && typeof value.version === "string") {
			version = value.version;
		} else {
			issues.push("CLI version: response is missing a string version.");
		}
		issues.push(...versionResult.value.warnings.map((warning) => `CLI warning: ${warning.message}`));
	} else {
		issues.push(`CLI version: ${errorMessage(versionResult.reason)}`);
	}

	let workspaceIcons: Record<string, WorkspaceIcon> = {};
	if (status.workspaces) {
		try {
			workspaceIcons = await loadWorkspaceIcons(
				status.workspaces.map((workspace) => workspace.workspace),
				source,
			);
		} catch (error) {
			issues.push(`Workspace icons: ${errorMessage(error)}`);
		}
	}

	return {
		status,
		rawStatus,
		version,
		source,
		executablePath,
		workspaceIcons,
		issues,
	};
}

function parseStatus(value: unknown, issues: string[]): PartialFXCodexStatus {
	if (!isRecord(value)) {
		issues.push("CLI status: response data is not an object.");
		return {};
	}

	const status: PartialFXCodexStatus = {};
	assignString(value, "currentWorkspace", status, issues);
	assignString(value, "currentWorkspaceID", status, issues);
	assignString(value, "supportDirectoryURL", status, issues);
	assignNullableString(value, "applicationURL", status, issues);

	if ("preferences" in value) {
		const preferences = parsePreferences(value.preferences);
		if (preferences) status.preferences = preferences;
		else issues.push("CLI status: preferences are malformed.");
	} else {
		issues.push("CLI status: preferences are missing.");
	}

	if ("workspaces" in value) {
		if (Array.isArray(value.workspaces)) {
			status.workspaces = value.workspaces.flatMap((workspace, index) => {
				const parsed = parseWorkspaceStatus(workspace);
				if (parsed) return [parsed];
				issues.push(`CLI status: workspace at index ${index} is malformed.`);
				return [];
			});
		} else {
			issues.push("CLI status: workspaces are not an array.");
		}
	} else {
		issues.push("CLI status: workspaces are missing.");
	}

	if ("raycastApplications" in value) {
		if (Array.isArray(value.raycastApplications)) {
			status.raycastApplications = value.raycastApplications.flatMap((application, index) => {
				const parsed = parseApplicationStatus(application);
				if (parsed) return [parsed];
				issues.push(`CLI status: Raycast application at index ${index} is malformed.`);
				return [];
			});
		} else {
			issues.push("CLI status: Raycast applications are not an array.");
		}
	} else {
		issues.push("CLI status: Raycast applications are missing.");
	}

	if ("raycastScriptCommands" in value) {
		const scriptCommands = parseScriptCommandStatus(value.raycastScriptCommands);
		if (scriptCommands) status.raycastScriptCommands = scriptCommands;
		else issues.push("CLI status: Raycast Script Command status is malformed.");
	} else {
		issues.push("CLI status: Raycast Script Command status is missing.");
	}

	return status;
}

function parseWorkspaceStatus(value: unknown): WorkspaceStatus | undefined {
	if (!isRecord(value) || !isRecord(value.workspace) || typeof value.isCurrent !== "boolean") return undefined;

	const workspace = value.workspace;
	if (
		typeof workspace.id !== "string" ||
		typeof workspace.name !== "string" ||
		(workspace.kind !== "primary" && workspace.kind !== "managed")
	) {
		return undefined;
	}

	const parsedWorkspace: Workspace = {
		id: workspace.id,
		name: workspace.name,
		kind: workspace.kind,
		rootURL: nullableString(workspace.rootURL),
		codexHomeURL: nullableString(workspace.codexHomeURL),
		userDataURL: nullableString(workspace.userDataURL),
		integrations: isRecord(workspace.integrations) ? workspace.integrations : {},
	};
	const processID = typeof value.processID === "number" || value.processID === null ? value.processID : undefined;
	return {
		workspace: parsedWorkspace,
		isCurrent: value.isCurrent,
		processID,
	};
}

function parsePreferences(value: unknown): FXCodexPreferences | undefined {
	if (!isRecord(value) || typeof value.autoRename !== "boolean") return undefined;

	const autoUpdate = parseAutoUpdatePolicy(value.autoUpdate);
	if (!autoUpdate) return undefined;
	return {
		autoRename: value.autoRename,
		autoUpdate,
	};
}

function parseAutoUpdatePolicy(value: unknown): AutoUpdatePolicy | undefined {
	if (!isRecord(value)) return undefined;
	if (!["disabled", "patch", "minor", "major", "latest"].includes(String(value.channel))) return undefined;

	return {
		channel: value.channel as AutoUpdatePolicy["channel"],
		...(typeof value.from === "string" ? { from: value.from } : {}),
	};
}

function parseApplicationStatus(value: unknown): ApplicationStatus | undefined {
	if (!isRecord(value) || (value.edition !== "stable" && value.edition !== "beta")) return undefined;
	return {
		edition: value.edition,
		applicationURL: nullableString(value.applicationURL),
		version: nullableString(value.version),
	};
}

function parseScriptCommandStatus(value: unknown): ScriptCommandStatus | undefined {
	if (!isRecord(value) || typeof value.managedCommandCount !== "number") return undefined;
	return {
		directoryURL: nullableString(value.directoryURL),
		managedCommandCount: value.managedCommandCount,
	};
}

function assignString(
	source: Record<string, unknown>,
	key: "currentWorkspace" | "currentWorkspaceID" | "supportDirectoryURL",
	target: PartialFXCodexStatus,
	issues: string[],
) {
	const value = source[key];
	if (typeof value === "string") target[key] = value;
	else issues.push(`CLI status: ${key} is ${key in source ? "not a string" : "missing"}.`);
}

function assignNullableString(
	source: Record<string, unknown>,
	key: "applicationURL",
	target: PartialFXCodexStatus,
	issues: string[],
) {
	const value = source[key];
	if (typeof value === "string" || value === null) target[key] = value;
	else issues.push(`CLI status: ${key} is ${key in source ? "neither a string nor null" : "missing"}.`);
}

function nullableString(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
