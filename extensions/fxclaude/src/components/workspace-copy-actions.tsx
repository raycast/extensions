import { Action, ActionPanel, Icon } from "@raycast/api";
import { WorkspaceStatus } from "../lib/models";
import { filesystemPath } from "../lib/ui";

export function WorkspaceCopyActions({ workspace }: { workspace: WorkspaceStatus }) {
	const path = workspace.workspace.rootURL ? filesystemPath(workspace.workspace.rootURL) : undefined;

	return (
		<ActionPanel.Section title="Copy Workspace">
			<Action.CopyToClipboard title="Copy Name" icon={Icon.CopyClipboard} content={workspace.workspace.name} />
			<Action.CopyToClipboard title="Copy ID" icon={Icon.CopyClipboard} content={workspace.workspace.id} />
			{path && <Action.CopyToClipboard title="Copy Path" icon={Icon.CopyClipboard} content={path} />}
			{workspace.processID != null && (
				<Action.CopyToClipboard title="Copy PID" icon={Icon.CopyClipboard} content={String(workspace.processID)} />
			)}
		</ActionPanel.Section>
	);
}
