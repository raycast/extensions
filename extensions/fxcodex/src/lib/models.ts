// Executables are identified by absolute path so several independently versioned
// installations can coexist and callers keep using the exact selected binary.
export type ExecutableSource = string;

export interface SemanticVersion {
	major: number;
	minor: number;
	patch: number;
	prerelease?: string[];
}

export interface Workspace {
	id: string;
	name: string;
	kind: "primary" | "managed";
	rootURL: string | null;
	codexHomeURL: string | null;
	userDataURL: string | null;
	integrations: Record<string, unknown>;
}

export interface WorkspaceStatus {
	workspace: Workspace;
	isCurrent: boolean;
	processID?: number | null;
}

export interface AutoUpdatePolicy {
	channel: "disabled" | "patch" | "minor" | "major" | "latest";
	from?: string;
}

export interface FXCodexPreferences {
	autoRename: boolean;
	autoUpdate: AutoUpdatePolicy;
}

export interface ApplicationStatus {
	edition: "stable" | "beta";
	applicationURL: string | null;
	version: string | null;
}

export interface ScriptCommandStatus {
	directoryURL: string | null;
	managedCommandCount: number;
}

export interface FXCodexStatus {
	currentWorkspace: string;
	currentWorkspaceID: string;
	supportDirectoryURL: string;
	applicationURL: string | null;
	preferences: FXCodexPreferences;
	workspaces: WorkspaceStatus[];
	raycastApplications: ApplicationStatus[];
	raycastScriptCommands: ScriptCommandStatus;
}

export type PartialFXCodexStatus = Partial<FXCodexStatus>;

export interface VersionOutput {
	version: string;
}

export interface UpdateResult {
	outcome: "updated" | "already-current";
	previousVersion: string;
	version: string;
}

export interface MachineWarning {
	code: string;
	message: string;
}

export interface MachineResponse<T> {
	apiVersion: number;
	ok: true;
	data: T;
}

export interface MachineErrorResponse {
	apiVersion: number;
	ok: false;
	error: {
		code: string;
		message: string;
	};
}

export interface MachineWarningResponse {
	apiVersion: number;
	warning: MachineWarning;
}

export interface InvocationResult<T> {
	data: T;
	warnings: MachineWarning[];
}
