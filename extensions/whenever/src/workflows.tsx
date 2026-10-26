import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { Action, ActionPanel, Detail, Icon, List, useNavigation, type Image } from '@raycast/api';
import type { Activity } from './activity.ts';
import type { Workflow } from './api.ts';
import { activityFor, api } from './auth.ts';
import { ErrorView } from './error-view.tsx';
import {
	formatDate,
	workflowMarkdown,
	workflowPresentation,
	workflowStatus,
} from './presentation.ts';
import { RunDetail } from './run-detail.tsx';
import { RunForm } from './run-form.tsx';
import { Runs } from './runs.tsx';
import { statusIcon, statusTag, toneColor } from './status.ts';
import { useLoad } from './use-load.ts';
import { APP_URL, workflowUrl } from './urls.ts';

export type Destination = 'details' | 'run' | 'runs';
const DESTINATIONS: Record<
	Destination,
	{
		title: string;
		icon: Image.ImageLike;
		placeholder: string;
		view: (workflow: Workflow, activity: Activity) => ReactElement;
	}
> = {
	details: {
		title: 'View Workflow',
		icon: Icon.Eye,
		placeholder: 'Search workflows',
		view: (workflow, activity) => <WorkflowDetail workflow={workflow} activity={activity} />,
	},
	run: {
		title: 'Review and Run',
		icon: Icon.Play,
		placeholder: 'Choose a workflow to run',
		view: (workflow, activity) => <RunForm workflow={workflow} activity={activity} />,
	},
	runs: {
		title: 'View Runs',
		icon: Icon.Clock,
		placeholder: 'Choose a workflow to view its runs',
		view: (workflow, activity) => <Runs workflow={workflow} activity={activity} />,
	},
};
const lastActivity = (workflow: Workflow) => workflow.lastActivityAt ?? workflow.updatedAt ?? '';
const byMostRecentActivity = (a: Workflow, b: Workflow) =>
	lastActivity(b).localeCompare(lastActivity(a)) || a.name.localeCompare(b.name);
function workflowIcon(workflow: Workflow) {
	return statusIcon(
		workflowPresentation(workflow),
		workflowStatus(workflow) === 'draft' ? Icon.Circle : Icon.CircleFilled,
	);
}
export function Workflows({ account, primary }: { account: string; primary: Destination }) {
	const { push } = useNavigation();
	const [searchText, setSearchText] = useState('');
	const activity = useMemo(() => activityFor(account), [account]);
	const list = useLoad(useCallback(() => api.workflows(), []));
	const local = useLoad(useCallback(() => activity.read(), [activity]));
	const error = list.error ?? local.error;
	const reload = () => {
		list.reload();
		local.reload();
	};
	if (error) return <ErrorView error={error} retry={reload} />;
	const all = [...(list.data?.workflows ?? [])].sort(byMostRecentActivity);
	const destinations = [primary, ...(['run', 'runs'] as const).filter((item) => item !== primary)];
	const row = (item: Workflow) => (
		<List.Item
			key={item.id}
			title={item.name}
			keywords={[item.id, workflowPresentation(item).label]}
			icon={workflowIcon(item)}
			accessories={[statusTag(workflowPresentation(item))]}
			actions={
				<ActionPanel>
					{destinations.map((destination) => (
						<Action
							key={destination}
							title={DESTINATIONS[destination].title}
							icon={DESTINATIONS[destination].icon}
							onAction={() => push(DESTINATIONS[destination].view(item, activity))}
						/>
					))}
					<Action.OpenInBrowser title="Open Workflow in Whenever" url={workflowUrl(item.id)} />
					<Action.CopyToClipboard title="Copy Workflow Link" content={workflowUrl(item.id)} />
					<Action title="Refresh" icon={Icon.ArrowClockwise} onAction={reload} />
				</ActionPanel>
			}
		/>
	);
	const pinned = all.filter((item) => item.pinned);
	const unpinned = all.filter((item) => !item.pinned);
	return (
		<List
			isLoading={list.busy || local.busy}
			filtering
			onSearchTextChange={setSearchText}
			searchBarPlaceholder={DESTINATIONS[primary].placeholder}
		>
			{!list.busy && (
				<List.EmptyView
					icon={Icon.MagnifyingGlass}
					title={searchText ? 'No matching workflows' : 'No workflows yet'}
					description={
						searchText ? 'Try a different search term.' : 'Workflows you create will appear here.'
					}
					actions={
						<ActionPanel>
							<Action.OpenInBrowser title="Open Whenever" url={APP_URL} />
							<Action title="Refresh" icon={Icon.ArrowClockwise} onAction={reload} />
						</ActionPanel>
					}
				/>
			)}
			{list.data && list.data.completeness !== 'complete' && (
				<List.Section
					title="Partial workflow list"
					subtitle="Refresh or open Whenever to find other workflows"
				/>
			)}
			{pinned.length > 0 && <List.Section title="Pinned">{pinned.map(row)}</List.Section>}
			<List.Section title="Workflows">{unpinned.map(row)}</List.Section>
			{primary === 'runs' && !searchText && (
				<List.Section title="Runs Started from Raycast">
					{local.data?.runs.map((item) => (
						<List.Item
							key={item.runId}
							title={all.find((w) => w.id === item.workflowId)?.name ?? item.workflowId}
							subtitle={item.runId}
							accessories={[{ text: item.pending ? 'Launch uncertain' : `Saved v${item.version}` }]}
							actions={
								<ActionPanel>
									<Action
										title="Inspect Run"
										icon={Icon.List}
										onAction={() =>
											push(
												<RunDetail
													workflowId={item.workflowId}
													runId={item.runId}
													activity={activity}
												/>,
											)
										}
									/>
								</ActionPanel>
							}
						/>
					))}
				</List.Section>
			)}
		</List>
	);
}
function WorkflowDetail({ workflow, activity }: { workflow: Workflow; activity: Activity }) {
	const { push } = useNavigation();
	const state = useLoad(useCallback(() => api.workflow(workflow.id), [workflow.id]));
	const runs = useLoad(useCallback(() => api.runs(workflow.id), [workflow.id]));
	if (state.error) return <ErrorView error={state.error} retry={state.reload} />;
	const status = workflowPresentation(workflow);
	const saved = state.data?.version;
	const savedAt = state.data?.savedAt;
	return (
		<Detail
			isLoading={state.busy || runs.busy}
			navigationTitle={workflow.name}
			markdown={workflowMarkdown(workflow, {
				...(state.data?.triggers === undefined ? {} : { triggers: state.data.triggers }),
				...(state.data === undefined ? {} : { integrations: state.data.integrations }),
				...(runs.data === undefined ? {} : { runs: runs.data.runs }),
				runsFailed: runs.error !== undefined,
			})}
			metadata={
				<Detail.Metadata>
					<Detail.Metadata.TagList title="Status">
						<Detail.Metadata.TagList.Item text={status.label} color={toneColor(status.tone)} />
					</Detail.Metadata.TagList>
					<Detail.Metadata.Label
						title="Latest saved version"
						text={
							saved === undefined
								? 'None'
								: `v${saved}${savedAt === undefined ? '' : ` · ${formatDate(savedAt)}`}`
						}
					/>
					<Detail.Metadata.Label
						title="Published version"
						text={
							state.data?.deployedVersion === undefined ? 'None' : `v${state.data.deployedVersion}`
						}
					/>
					{workflow.pinned && <Detail.Metadata.Label title="Pinned" icon={Icon.Pin} />}
					<Detail.Metadata.Separator />
					<Detail.Metadata.Link
						title="Whenever"
						target={workflowUrl(workflow.id)}
						text="Open workflow"
					/>
				</Detail.Metadata>
			}
			actions={
				<ActionPanel>
					{(['run', 'runs'] as const).map((destination) => (
						<Action
							key={destination}
							title={DESTINATIONS[destination].title}
							icon={DESTINATIONS[destination].icon}
							onAction={() => push(DESTINATIONS[destination].view(workflow, activity))}
						/>
					))}
					<Action.OpenInBrowser title="Open Workflow in Whenever" url={workflowUrl(workflow.id)} />
				</ActionPanel>
			}
		/>
	);
}
