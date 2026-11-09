import { useCallback } from 'react';
import { Action, ActionPanel, Icon, List, useNavigation } from '@raycast/api';
import type { Activity } from './activity.ts';
import type { Workflow } from './api.ts';
import { api } from './auth.ts';
import { ErrorView } from './error-view.tsx';
import {
	formatDuration,
	formatTimestamp,
	runDescription,
	runPresentation,
	triggerLabel,
} from './presentation.ts';
import { RunDetail } from './run-detail.tsx';
import { statusIcon } from './status.ts';
import { useLoad } from './use-load.ts';
import { workflowUrl } from './urls.ts';

export function Runs({ workflow, activity }: { workflow: Workflow; activity: Activity }) {
	const { push } = useNavigation();
	const state = useLoad(useCallback(() => api.runs(workflow.id), [workflow.id]));
	if (state.error) return <ErrorView error={state.error} retry={state.reload} />;
	const runs = [...(state.data?.runs ?? [])].sort((a, b) => b.startedAt - a.startedAt);
	return (
		<List
			isLoading={state.busy}
			navigationTitle={`${workflow.name} · Run history`}
			searchBarPlaceholder="Search runs by status, trigger, or ID"
		>
			{!state.busy && (
				<List.EmptyView
					icon={Icon.Clock}
					title="No runs yet"
					description="Run the workflow to see activity here."
					actions={
						<ActionPanel>
							<Action title="Refresh" icon={Icon.ArrowClockwise} onAction={state.reload} />
							<Action.OpenInBrowser
								title="Open Workflow in Whenever"
								url={workflowUrl(workflow.id)}
							/>
						</ActionPanel>
					}
				/>
			)}
			{state.data && state.data.completeness !== 'complete' && (
				<List.Section
					title="Partial run history"
					subtitle="More runs may be available in Whenever"
				/>
			)}
			<List.Section title="Run history">
				{runs.map((run) => (
					<List.Item
						key={run.runId}
						title={formatTimestamp(run.startedAt)}
						subtitle={runDescription(run)}
						keywords={[
							run.runId,
							runPresentation(run).label,
							...(run.triggerType === undefined ? [] : [triggerLabel(run.triggerType)]),
						]}
						icon={statusIcon(runPresentation(run))}
						accessories={
							run.endedAt === undefined
								? []
								: [{ text: formatDuration(run.endedAt - run.startedAt), tooltip: 'Duration' }]
						}
						actions={
							<ActionPanel>
								<Action
									title="Inspect Run"
									icon={Icon.List}
									onAction={() =>
										push(
											<RunDetail workflowId={workflow.id} runId={run.runId} activity={activity} />,
										)
									}
								/>
								<Action.CopyToClipboard title="Copy Run ID" content={run.runId} />
								<Action title="Refresh" icon={Icon.ArrowClockwise} onAction={state.reload} />
							</ActionPanel>
						}
					/>
				))}
			</List.Section>
		</List>
	);
}
