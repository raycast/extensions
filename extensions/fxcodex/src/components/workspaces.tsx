import {
	Action,
	ActionPanel,
	Alert,
	Form,
	Grid,
	Icon,
	Keyboard,
	PopToRootType,
	Toast,
	closeMainWindow,
	confirmAlert,
	showToast,
	useNavigation,
} from "@raycast/api";
import { WorkspaceStatus } from "../lib/models";
import { filesystemPath, mutate } from "../lib/ui";
import {
	removeWorkspaceIcon,
	renameWorkspaceIcon,
	setCustomWorkspaceIcon,
	setRaycastWorkspaceIcon,
	WorkspaceIcon,
} from "../lib/workspace-icons";

const raycastIcons = Object.entries(Icon).map(([name, value]) => ({
	name,
	title: raycastIconTitle(name),
	value,
}));

export function WorkspaceActions({
	workspace,
	selectedIcon,
	onChange,
}: {
	workspace: WorkspaceStatus;
	selectedIcon?: WorkspaceIcon;
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
					await mutate(["open", workspace.workspace.name], "Opening workspace…", onChange);
					await closeMainWindow({ popToRootType: PopToRootType.Immediate });
				}}
			/>
			<Action
				title="Focus or Open Without Closing"
				icon={Icon.Play}
				onAction={() => mutate(["open", workspace.workspace.name], "Opening workspace…", onChange)}
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
					target={<WorkspaceIconGrid workspace={workspace} selectedIcon={selectedIcon} onChange={onChange} />}
				/>
				{workspace.processID != null && (
					<Action.CopyToClipboard title="Copy PID" icon={Icon.CopyClipboard} content={String(workspace.processID)} />
				)}
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
			{managed && stopped && (
				<ActionPanel.Section title="Danger Zone">
					<Action
						title="Erase Data…"
						icon={Icon.Eraser}
						style={Action.Style.Destructive}
						onAction={() => eraseWorkspace(workspace, onChange)}
					/>
					<Action
						title="Delete Workspace…"
						icon={Icon.Trash}
						style={Action.Style.Destructive}
						onAction={() => deleteWorkspace(workspace, onChange)}
					/>
				</ActionPanel.Section>
			)}
			<Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onChange} />
		</ActionPanel>
	);
}

export function CreateWorkspaceForm({ onChange }: { onChange: () => void }) {
	const { pop } = useNavigation();
	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Create Workspace"
						onSubmit={async (values: { name: string; use: boolean; open: boolean }) => {
							const args = ["workspace", "create", values.name.trim()];
							if (values.use) args.push("--use");
							if (values.open) args.push("--open");
							await mutate(args, "Creating workspace…", onChange);
							pop();
						}}
					/>
				</ActionPanel>
			}
		>
			<Form.TextField id="name" title="Name" placeholder="work" />
			<Form.Checkbox id="use" label="Set as current workspace" defaultValue />
			<Form.Checkbox id="open" label="Open after creating" />
		</Form>
	);
}

function RenameWorkspaceForm({ workspace, onChange }: { workspace: WorkspaceStatus; onChange: () => void }) {
	const { pop } = useNavigation();
	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Rename Workspace"
						onSubmit={async (values: { name: string }) => {
							const newName = values.name.trim();
							await mutate(
								["workspace", "rename", workspace.workspace.name, newName],
								"Renaming workspace…",
								() => undefined,
							);
							await renameWorkspaceIcon(workspace.workspace.name, newName);
							onChange();
							pop();
						}}
					/>
				</ActionPanel>
			}
		>
			<Form.TextField id="name" title="New Name" defaultValue={workspace.workspace.name} />
		</Form>
	);
}

function WorkspaceIconGrid({
	workspace,
	selectedIcon,
	onChange,
}: {
	workspace: WorkspaceStatus;
	selectedIcon?: WorkspaceIcon;
	onChange: () => void;
}) {
	const { pop } = useNavigation();
	const selectIcon = async (icon: Icon) => {
		await setRaycastWorkspaceIcon(workspace.workspace.name, icon);
		await showToast({ style: Toast.Style.Success, title: "Workspace Icon Set" });
		onChange();
		pop();
	};
	const resetIcon = async () => {
		await removeWorkspaceIcon(workspace.workspace.name);
		await showToast({ style: Toast.Style.Success, title: "Workspace Icon Reset" });
		onChange();
		pop();
	};

	return (
		<Grid
			navigationTitle={`Set Icon for ${workspace.workspace.name}`}
			searchBarPlaceholder="Search Raycast icons…"
			columns={8}
			inset={Grid.Inset.Medium}
		>
			{raycastIcons.map((icon) => (
				<Grid.Item
					key={icon.name}
					id={icon.name}
					content={{ value: icon.value, tooltip: icon.title }}
					title={icon.title}
					keywords={[icon.name, icon.value]}
					accessory={
						selectedIcon?.type === "raycast" && selectedIcon.value === icon.value ? { icon: Icon.Check } : undefined
					}
					actions={
						<ActionPanel>
							<Action title={`Use ${icon.title}`} icon={icon.value} onAction={() => selectIcon(icon.value)} />
							<ActionPanel.Section>
								<Action.Push
									title="Use Custom Image…"
									icon={Icon.Image}
									target={<WorkspaceIconForm workspace={workspace} onChange={onChange} onComplete={pop} />}
								/>
								<Action title="Reset to Default" icon={Icon.ArrowCounterClockwise} onAction={resetIcon} />
							</ActionPanel.Section>
						</ActionPanel>
					}
				/>
			))}
		</Grid>
	);
}

function WorkspaceIconForm({
	workspace,
	onChange,
	onComplete,
}: {
	workspace: WorkspaceStatus;
	onChange: () => void;
	onComplete: () => void;
}) {
	const { pop } = useNavigation();
	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Use Custom Image"
						onSubmit={async (values: { icon: string[] }) => {
							const icon = values.icon[0];
							if (!icon) throw new Error("Choose an image.");
							await setCustomWorkspaceIcon(workspace.workspace.name, icon);
							await showToast({ style: Toast.Style.Success, title: "Custom Icon Set" });
							onChange();
							pop();
							setTimeout(onComplete, 0);
						}}
					/>
				</ActionPanel>
			}
		>
			<Form.FilePicker
				id="icon"
				title="Icon"
				allowMultipleSelection={false}
				canChooseDirectories={false}
				info="PNG, JPEG, GIF, WebP, or SVG"
			/>
		</Form>
	);
}

async function eraseWorkspace(workspace: WorkspaceStatus, onChange: () => void) {
	if (
		!(await confirmAlert({
			title: `Erase “${workspace.workspace.name}”?`,
			message: "Codex settings, sessions, and integrations for this workspace will be removed.",
			primaryAction: { title: "Erase", style: Alert.ActionStyle.Destructive },
		}))
	)
		return;
	await mutate(["erase", workspace.workspace.name, "--yes"], "Erasing workspace…", onChange);
}

async function deleteWorkspace(workspace: WorkspaceStatus, onChange: () => void) {
	if (
		!(await confirmAlert({
			title: `Delete “${workspace.workspace.name}”?`,
			message: "The workspace and all of its managed data will be permanently deleted.",
			primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
		}))
	)
		return;
	await mutate(["delete", workspace.workspace.name, "--yes"], "Deleting workspace…", () => undefined);
	await removeWorkspaceIcon(workspace.workspace.name);
	onChange();
}

function raycastIconTitle(name: string): string {
	return name.replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}
