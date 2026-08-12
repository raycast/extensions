import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Dashboard } from "../lib/dashboard";
import { applicationDisplayName, filesystemPath } from "../lib/ui";
import { DiagnosticsView } from "./diagnostics";
import { WorkspaceCopyActions } from "./workspace-copy-actions";

export function StatusView({ dashboard }: { dashboard: Dashboard }) {
	const workspaces = dashboard.status.workspaces ?? [];
	const currentWorkspace =
		workspaces.find((workspace) => workspace.workspace.id === dashboard.status.currentWorkspaceID) ??
		workspaces.find((workspace) => workspace.isCurrent) ??
		workspaces.find((workspace) => workspace.workspace.name === dashboard.status.currentWorkspace);
	const running = workspaces.filter((workspace) => workspace.processID != null).length;
	return (
		<List searchBarPlaceholder="Search status…">
			<List.Section title="Status">
				{currentWorkspace ? (
					<List.Item
						title="Current Workspace"
						subtitle={currentWorkspace.workspace.name}
						icon={Icon.CheckCircle}
						actions={
							<ActionPanel>
								<WorkspaceCopyActions workspace={currentWorkspace} />
							</ActionPanel>
						}
					/>
				) : (
					<StatusItem
						title="Current Workspace"
						value={dashboard.status.currentWorkspace ?? "Unavailable"}
						icon={Icon.CheckCircle}
						copyTitle="Copy Name"
					/>
				)}
				<StatusItem
					title="Workspaces"
					value={dashboard.status.workspaces ? String(workspaces.length) : "Unavailable"}
					icon={Icon.Folder}
					copyTitle="Copy Workspace Count"
				/>
				<StatusItem
					title="Running Workspaces"
					value={dashboard.status.workspaces ? String(running) : "Unavailable"}
					icon={Icon.Play}
					copyTitle="Copy Running Workspace Count"
				/>
				<StatusItem
					title="Application"
					value={
						dashboard.status.applicationURL === undefined
							? "Unavailable"
							: applicationDisplayName(dashboard.status.applicationURL)
					}
					icon={Icon.AppWindow}
					finderPath={dashboard.status.applicationURL}
				/>
				<StatusItem
					title="Executable"
					value={dashboard.version ? `fxCodex ${dashboard.version}` : "Unknown version"}
					icon={Icon.Terminal}
					finderPath={dashboard.executablePath}
				/>
				<StatusItem
					title="Support Folder"
					value={
						dashboard.status.supportDirectoryURL ? filesystemPath(dashboard.status.supportDirectoryURL) : "Unavailable"
					}
					icon={Icon.Folder}
					finderPath={dashboard.status.supportDirectoryURL}
				/>
			</List.Section>
			<List.Section title="Diagnostics">
				{dashboard.issues.length > 0 &&
					dashboard.issues.map((issue, index) => (
						<List.Item
							key={`${index}-${issue}`}
							title={issue}
							icon={Icon.ExclamationMark}
							actions={
								<ActionPanel>
									<Action.CopyToClipboard title="Copy Issue" content={issue} />
								</ActionPanel>
							}
						/>
					))}
				<List.Item
					title="Diagnostics"
					subtitle={
						dashboard.issues.length > 0
							? `${dashboard.issues.length} issue${dashboard.issues.length === 1 ? "" : "s"} · Direct storage and CLI probes`
							: "Direct storage and optional CLI probes"
					}
					icon={dashboard.issues.length > 0 ? Icon.ExclamationMark : Icon.Heartbeat}
					actions={
						<ActionPanel>
							<Action.Push
								title="Open Diagnostics"
								icon={Icon.Heartbeat}
								target={<DiagnosticsView dashboard={dashboard} />}
							/>
							{dashboard.issues.length > 0 && (
								<Action.CopyToClipboard title="Copy Issues" content={dashboard.issues.join("\n")} />
							)}
						</ActionPanel>
					}
				/>
			</List.Section>
		</List>
	);
}

function StatusItem({
	title,
	value,
	icon,
	copyTitle,
	finderPath,
}: {
	title: string;
	value: string;
	icon: Icon;
	copyTitle?: string;
	finderPath?: string | null;
}) {
	const path = finderPath ? filesystemPath(finderPath) : undefined;

	return (
		<List.Item
			title={title}
			subtitle={value}
			icon={icon}
			actions={
				<ActionPanel>
					{path && <Action.ShowInFinder title={`Show ${title} in Finder`} path={path} />}
					<Action.CopyToClipboard
						title={path ? `Copy ${title} Path` : (copyTitle ?? `Copy ${title}`)}
						content={path ?? value}
					/>
				</ActionPanel>
			}
		/>
	);
}
