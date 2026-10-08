import { Action, ActionPanel, Grid, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { ExecutableSource, WorkspaceStatus } from "../lib/models";
import { removeWorkspaceIcon, setRaycastWorkspaceIcon, WorkspaceIcon } from "../lib/workspace-icons";
import { WorkspaceIconForm } from "./workspace-icon-form";

const raycastIcons = Object.entries(Icon).map(([name, value]) => ({
	name,
	title: raycastIconTitle(name),
	value,
}));

export function WorkspaceIconGrid({
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
	const { pop } = useNavigation();
	const selectIcon = async (icon: Icon) => {
		await setRaycastWorkspaceIcon(workspace.workspace.id, icon, executableSource);
		await showToast({ style: Toast.Style.Success, title: "Workspace Icon Set" });
		onChange();
		pop();
	};
	const resetIcon = async () => {
		await removeWorkspaceIcon(workspace.workspace.id, selectedIcon, executableSource);
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
									target={
										<WorkspaceIconForm
											workspace={workspace}
											selectedIcon={selectedIcon}
											executableSource={executableSource}
											onChange={onChange}
											onComplete={pop}
										/>
									}
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

function raycastIconTitle(name: string): string {
	return name.replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}
