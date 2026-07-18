import { ExecutableSource, FXCodexStatus } from "./models";
import { WorkspaceIcon } from "./workspace-icons";

export interface Dashboard {
	status: FXCodexStatus;
	version: string;
	source: ExecutableSource;
	executablePath: string;
	workspaceIcons: Record<string, WorkspaceIcon>;
}
