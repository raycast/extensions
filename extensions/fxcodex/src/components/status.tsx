import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Dashboard } from "../lib/dashboard";
import { applicationDisplayName, capitalize, filesystemPath } from "../lib/ui";
import { DiagnosticsView } from "./diagnostics";

export function StatusView({ dashboard }: { dashboard: Dashboard }) {
	const running = dashboard.status.workspaces.filter((workspace) => workspace.processID != null).length;
	return (
		<List searchBarPlaceholder="Search status…">
			<List.Section title="Status">
				<StatusItem
					title="Current Workspace"
					value={dashboard.status.currentWorkspace}
					icon={Icon.CheckCircle}
					dashboard={dashboard}
				/>
				<StatusItem
					title="Workspaces"
					value={String(dashboard.status.workspaces.length)}
					icon={Icon.Folder}
					dashboard={dashboard}
				/>
				<StatusItem title="Running Workspaces" value={String(running)} icon={Icon.Play} dashboard={dashboard} />
				<StatusItem
					title="Application"
					value={applicationDisplayName(dashboard.status.applicationURL)}
					icon={Icon.AppWindow}
					dashboard={dashboard}
					finderPath={dashboard.status.applicationURL}
				/>
				<StatusItem
					title="Executable"
					value={`${capitalize(dashboard.source)} · ${dashboard.version}`}
					icon={Icon.Terminal}
					dashboard={dashboard}
					finderPath={dashboard.executablePath}
				/>
				<StatusItem
					title="Support Folder"
					value={filesystemPath(dashboard.status.supportDirectoryURL)}
					icon={Icon.Folder}
					dashboard={dashboard}
					finderPath={dashboard.status.supportDirectoryURL}
				/>
			</List.Section>
		</List>
	);
}

function StatusItem({
	title,
	value,
	icon,
	dashboard,
	finderPath,
}: {
	title: string;
	value: string;
	icon: Icon;
	dashboard: Dashboard;
	finderPath?: string | null;
}) {
	return (
		<List.Item
			title={title}
			subtitle={value}
			icon={icon}
			actions={
				<ActionPanel>
					{finderPath && <Action.ShowInFinder title={`Show ${title} in Finder`} path={filesystemPath(finderPath)} />}
					<Action.CopyToClipboard title={`Copy ${title}`} content={value} />
					<Action.Push
						title="Open Diagnostics"
						icon={Icon.Heartbeat}
						target={<DiagnosticsView dashboard={dashboard} />}
					/>
				</ActionPanel>
			}
		/>
	);
}
