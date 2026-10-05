import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { CodexView } from "./components/codex";
import { ExecutableView } from "./components/executable-view";
import { ManagementItem } from "./components/management-item";
import { StatusView } from "./components/status";
import { WorkspaceActions } from "./components/workspace-actions";
import { Dashboard, loadDashboard } from "./lib/dashboard";
import { WorkspaceStatus } from "./lib/models";
import { applicationIcon } from "./lib/ui";
import { WorkspaceIcon, workspaceIconImage } from "./lib/workspace-icons";

interface CachedWorkspaceResults {
	version: 2;
	workspaces: WorkspaceStatus[];
	workspaceIcons: Record<string, WorkspaceIcon>;
}

export default function FXCodexCommand() {
	const [selectedItemId, setSelectedItemId] = useState<string>();
	const [cachedWorkspaceResults, setCachedWorkspaceResults] = useCachedState<CachedWorkspaceResults>(
		"workspace-results-v2",
		{
			version: 2,
			workspaces: [],
			workspaceIcons: {},
		},
	);
	const { data, error, isLoading, revalidate } = usePromise(loadDashboard, []);
	const dashboard: Dashboard = data ?? {
		status: {},
		source: "",
		executablePath: "",
		workspaceIcons: {},
		issues: error ? [`Extension dashboard: ${error.message}`] : [],
	};
	const issues = [...dashboard.issues, ...(error && data ? [`Extension dashboard refresh: ${error.message}`] : [])];
	const hasFreshWorkspaceResults = !isLoading && data?.status.workspaces !== undefined;
	const workspaceResults =
		data?.status.workspaces !== undefined
			? {
					workspaces: data.status.workspaces,
					workspaceIcons: data.workspaceIcons,
				}
			: cachedWorkspaceResults;

	useEffect(() => {
		if (!hasFreshWorkspaceResults || !data?.status.workspaces) return;

		setCachedWorkspaceResults({
			version: 2,
			workspaces: data.status.workspaces,
			workspaceIcons: data.workspaceIcons,
		});
	}, [data, hasFreshWorkspaceResults, setCachedWorkspaceResults]);

	useEffect(() => {
		const currentWorkspace =
			dashboard.status.currentWorkspaceID ??
			workspaceResults.workspaces.find((workspace) => workspace.isCurrent)?.workspace.id;
		if (currentWorkspace) setSelectedItemId(`workspace-${currentWorkspace}`);
	}, [dashboard.status.currentWorkspaceID, workspaceResults.workspaces]);

	const workspaces = [...workspaceResults.workspaces].sort((lhs, rhs) => {
		if (lhs.workspace.kind !== rhs.workspace.kind) return lhs.workspace.kind === "primary" ? -1 : 1;
		return lhs.workspace.name.localeCompare(rhs.workspace.name);
	});

	return (
		<List
			isLoading={isLoading}
			searchBarPlaceholder="Search workspaces and management…"
			selectedItemId={selectedItemId}
			onSelectionChange={(id) => {
				if (id) setSelectedItemId(id);
			}}
		>
			{issues.length > 0 && (
				<List.Section title="Problems">
					<List.Item
						id="problems"
						title={issues.length === 1 ? "fxCodex Needs Attention" : `fxCodex Has ${issues.length} Issues`}
						subtitle={issues[0]}
						icon={Icon.ExclamationMark}
						accessories={[{ tag: { value: String(issues.length), color: Color.Orange } }]}
						actions={
							<ActionPanel>
								<Action.Push title="Open Status" icon={Icon.Info} target={<StatusView dashboard={dashboard} />} />
								<Action.Push
									title="Open Preferences"
									icon={Icon.Gear}
									target={<ExecutableView onChange={revalidate} />}
								/>
								<Action.CopyToClipboard title="Copy Issues" content={issues.join("\n")} />
								<Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
							</ActionPanel>
						}
					/>
				</List.Section>
			)}
			<List.Section title="Workspaces">
				{workspaces.map((workspace) => (
					<List.Item
						key={workspace.workspace.id}
						id={`workspace-${workspace.workspace.id}`}
						icon={workspaceIconImage(
							workspaceResults.workspaceIcons[workspace.workspace.id],
							workspace.workspace.kind === "primary" ? Icon.House : Icon.Folder,
						)}
						title={workspace.workspace.name}
						accessories={[
							...(workspace.isCurrent ? [{ tag: { value: "Current", color: Color.Green } }] : []),
							...(workspace.processID ? [{ text: "Running", icon: Icon.CircleFilled }] : []),
						]}
						actions={
							hasFreshWorkspaceResults ? (
								<WorkspaceActions
									workspace={workspace}
									selectedIcon={workspaceResults.workspaceIcons[workspace.workspace.id]}
									executableSource={dashboard.source}
									onChange={revalidate}
								/>
							) : undefined
						}
					/>
				))}
			</List.Section>
			<List.Section title="Management">
				<ManagementItem
					id="status"
					title="Status"
					icon={Icon.Info}
					subtitle={issues.length > 0 ? `${issues.length} issue${issues.length === 1 ? "" : "s"}` : "Healthy"}
					target={<StatusView dashboard={dashboard} />}
					onRefresh={revalidate}
				/>
				<ManagementItem
					id="codex"
					title="Codex"
					icon={applicationIcon(dashboard.status.applicationURL)}
					target={<CodexView source={dashboard.source} onChange={revalidate} />}
					onRefresh={revalidate}
				/>
				<ManagementItem
					id="preferences"
					title="Preferences"
					icon={Icon.Gear}
					target={<ExecutableView onChange={revalidate} />}
					onRefresh={revalidate}
				/>
			</List.Section>
		</List>
	);
}
