import { Action, ActionPanel, Alert, Icon, Keyboard, PopToRootType, closeMainWindow, confirmAlert } from "@raycast/api";
import { ExecutableSource, WorkspaceStatus } from "../lib/models";
import { filesystemPath, mutate } from "../lib/ui";
import { removeWorkspaceIcon, WorkspaceIcon } from "../lib/workspace-icons";
import { CreateWorkspaceForm } from "./create-workspace-form";
import { RenameWorkspaceForm } from "./rename-workspace-form";
import { WorkspaceCopyActions } from "./workspace-copy-actions";
import { WorkspaceIconGrid } from "./workspace-icon-grid";

export function WorkspaceActions({
	workspace,
	selectedIcon,
	executableSource,
	onChange,
}: {
	workspace: WorkspaceStatus;
	selectedIcon?: WorkspaceIcon;
	executableSource?: ExecutableSource;
	onChange: () => void;
}) {
	const managed = workspace.workspace.kind === "managed";
	const stopped = workspace.processID == null;

	return (
		<ActionPanel>
			<Action
				title="Focus or Open"
				icon={Icon.Play}
				onAction={async () => {
					await mutate(["open", "--workspace-id", workspace.workspace.id], "Opening workspace…", onChange);
					await closeMainWindow({ popToRootType: PopToRootType.Immediate });
				}}
			/>
			<Action
				title="Focus or Open Without Closing"
				icon={Icon.Play}
				onAction={() => mutate(["open", "--workspace-id", workspace.workspace.id], "Opening workspace…", onChange)}
			/>
			{!workspace.isCurrent && (
				<Action
					title="Set as Current"
					icon={Icon.CheckCircle}
					onAction={() => mutate(["use", workspace.workspace.name], "Switching workspace…", onChange)}
				/>
			)}
			<ActionPanel.Section title="Workspace">
				<Action.Push
					title="Create Workspace…"
					icon={Icon.Plus}
					shortcut={Keyboard.Shortcut.Common.New}
					target={<CreateWorkspaceForm onChange={onChange} />}
				/>
				<Action.Push
					title="Set Icon…"
					icon={Icon.Image}
					target={
						<WorkspaceIconGrid
							workspace={workspace}
							selectedIcon={selectedIcon}
							executableSource={executableSource}
							onChange={onChange}
						/>
					}
				/>
				{managed && stopped && (
					<Action.Push
						title="Rename…"
						icon={Icon.Pencil}
						target={<RenameWorkspaceForm workspace={workspace} onChange={onChange} />}
					/>
				)}
				{managed && workspace.workspace.rootURL && (
					<ActionPanel.Submenu title="Show in Finder…" icon={Icon.Finder}>
						<Action.ShowInFinder title="Show Workspace Folder" path={filesystemPath(workspace.workspace.rootURL)} />
						{workspace.workspace.codexHomeURL && (
							<Action.ShowInFinder title="Show CODEX_HOME" path={filesystemPath(workspace.workspace.codexHomeURL)} />
						)}
						{workspace.workspace.userDataURL && (
							<Action.ShowInFinder title="Show User Data" path={filesystemPath(workspace.workspace.userDataURL)} />
						)}
					</ActionPanel.Submenu>
				)}
			</ActionPanel.Section>
			<WorkspaceCopyActions workspace={workspace} />
			{managed && (
				<ActionPanel.Section title="Danger Zone">
					<Action
						title={stopped ? "Erase Data…" : "Erase Data — Close Workspace First"}
						icon={stopped ? Icon.Eraser : Icon.CircleDisabled}
						style={stopped ? Action.Style.Destructive : Action.Style.Regular}
						onAction={stopped ? () => eraseWorkspace(workspace, onChange) : undefined}
					/>
					<Action
						title={stopped ? "Delete Workspace…" : "Delete Workspace — Close Workspace First"}
						icon={stopped ? Icon.Trash : Icon.CircleDisabled}
						style={stopped ? Action.Style.Destructive : Action.Style.Regular}
						onAction={stopped ? () => deleteWorkspace(workspace, selectedIcon, executableSource, onChange) : undefined}
					/>
				</ActionPanel.Section>
			)}
			<Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onChange} />
		</ActionPanel>
	);
}

async function eraseWorkspace(workspace: WorkspaceStatus, onChange: () => void) {
	if (
		!(await confirmAlert({
			title: `Erase “${workspace.workspace.name}”?`,
			message:
				"Codex settings and sessions for this workspace will be removed. Its name and integration attributes are preserved.",
			primaryAction: { title: "Erase", style: Alert.ActionStyle.Destructive },
		}))
	)
		return;
	await mutate(["erase", workspace.workspace.name, "--yes"], "Erasing workspace…", onChange);
}

async function deleteWorkspace(
	workspace: WorkspaceStatus,
	selectedIcon: WorkspaceIcon | undefined,
	executableSource: ExecutableSource | undefined,
	onChange: () => void,
) {
	if (
		!(await confirmAlert({
			title: `Delete “${workspace.workspace.name}”?`,
			message: "The workspace and all of its managed data will be permanently deleted.",
			primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
		}))
	)
		return;
	await mutate(["delete", workspace.workspace.name, "--yes"], "Deleting workspace…", () => undefined);
	await removeWorkspaceIcon(workspace.workspace.id, selectedIcon, executableSource);
	onChange();
}
