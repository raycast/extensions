export type ExecutableSource = "bundled" | "external";

export interface Workspace {
	id: string;
	name: string;
	kind: "primary" | "managed";
	rootURL: string | null;
	userDataURL: string | null;
	integrations: Record<string, unknown>;
}

export interface WorkspaceStatus {
	workspace: Workspace;
	isCurrent: boolean;
	processID?: number | null;
}

export interface FXClaudeStatus {
	currentWorkspace: string;
	currentWorkspaceID: string;
	supportDirectoryURL: string;
	applicationURL: string | null;
	workspaces: WorkspaceStatus[];
}

export type PartialFXClaudeStatus = Partial<FXClaudeStatus>;

export interface VersionOutput {
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
