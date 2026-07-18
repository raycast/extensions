import { Action, ActionPanel, Color, Detail, Icon, Image, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { CodexView } from "./components/codex";
import { DiagnosticsView } from "./components/diagnostics";
import { ExecutableView } from "./components/executable";
import { ManagementItem } from "./components/management-item";
import { StatusView } from "./components/status";
import { WorkspaceActions } from "./components/workspaces";
import { loadStatus, loadVersion } from "./lib/client";
import { Dashboard } from "./lib/dashboard";
import { resolveExecutable, selectedExecutableSource } from "./lib/executable";
import { applicationIcon, capitalize } from "./lib/ui";
import { loadWorkspaceIcons, WorkspaceIcon } from "./lib/workspace-icons";

export default function FXCodexCommand() {
	const [selectedItemId, setSelectedItemId] = useState<string>();
	const { data, error, isLoading, revalidate } = usePromise(async (): Promise<Dashboard> => {
		const source = await selectedExecutableSource();
		const [status, version, executable] = await Promise.all([
			loadStatus(source),
			loadVersion(source),
			resolveExecutable(source),
		]);
		const workspaceIcons = await loadWorkspaceIcons(
			status.data.workspaces.map((workspace) => workspace.workspace.name),
		);
		return {
			status: status.data,
			version: version.data.version,
			source,
			executablePath: executable.path,
			workspaceIcons,
		};
	}, []);

	useEffect(() => {
		const currentWorkspace = data?.status.currentWorkspace;
		if (currentWorkspace) setSelectedItemId(`workspace-${currentWorkspace}`);
	}, [data?.status.currentWorkspace]);

	if (error && !data) {
		return (
			<List>
				<List.EmptyView
					icon={Icon.ExclamationMark}
					title="Unable to Load fxCodex"
					description={error.message}
					actions={
						<ActionPanel>
							<Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
							<Action.Push title="Manage Executable" target={<ExecutableView onChange={revalidate} />} />
						</ActionPanel>
					}
				/>
			</List>
		);
	}

	const workspaces = [...(data?.status.workspaces ?? [])].sort((lhs, rhs) => {
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
			<List.Section title="Workspaces">
				{workspaces.map((workspace) => (
					<List.Item
						key={workspace.workspace.name}
						id={`workspace-${workspace.workspace.name}`}
						icon={workspaceIcon(
							data?.workspaceIcons[workspace.workspace.name],
							workspace.workspace.kind === "primary" ? Icon.House : Icon.Folder,
						)}
						title={workspace.workspace.name}
						accessories={[
							...(workspace.isCurrent ? [{ tag: { value: "Current", color: Color.Green } }] : []),
							...(workspace.processID ? [{ text: "Running", icon: Icon.CircleFilled }] : []),
						]}
						actions={
							<WorkspaceActions
								workspace={workspace}
								selectedIcon={data?.workspaceIcons[workspace.workspace.name]}
								onChange={revalidate}
							/>
						}
					/>
				))}
			</List.Section>
			<List.Section title="Management">
				<ManagementItem
					id="status"
					title="Status"
					icon={Icon.Info}
					target={data ? <StatusView dashboard={data} /> : <Detail isLoading />}
					secondaryAction={
						data ? (
							<Action.Push
								title="Open Diagnostics"
								icon={Icon.Stethoscope}
								target={<DiagnosticsView dashboard={data} />}
							/>
						) : undefined
					}
					onRefresh={revalidate}
				/>
				<ManagementItem
					id="codex"
					title="Codex"
					icon={applicationIcon(data?.status.applicationURL)}
					target={data ? <CodexView source={data.source} onChange={revalidate} /> : <Detail isLoading />}
					onRefresh={revalidate}
				/>
				<ManagementItem
					id="executable"
					title="Executable"
					subtitle={data ? `${capitalize(data.source)} · ${data.version}` : undefined}
					icon={Icon.Terminal}
					target={<ExecutableView onChange={revalidate} />}
					onRefresh={revalidate}
				/>
			</List.Section>
		</List>
	);
}

function workspaceIcon(icon: WorkspaceIcon | undefined, fallback: Icon): Image.ImageLike {
	if (!icon) return fallback;
	return icon.type === "raycast" ? icon.value : { source: icon.path };
}
