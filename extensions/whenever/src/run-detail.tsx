import { useEffect, useRef, useState } from 'react';
import { Action, ActionPanel, Detail, Icon, List, useNavigation } from '@raycast/api';
import type { Activity } from './activity.ts';
import { outputText, resultUrl } from './api.ts';
import { api } from './auth.ts';
import { code, errorMessage } from './format.ts';
import { formatTimestamp, startedTriggerLabel } from './presentation.ts';
import { observe, outputNotice, runStatus, timeline, unobserved } from './run-observation.ts';
import { statusIcon } from './status.ts';
import { workflowUrl } from './urls.ts';

function useRunObservation(workflowId: string, runId: string, activity: Activity) {
	const [observation, setObservation] = useState(unobserved);
	const [auto, setAuto] = useState(true);
	const [revision, setRevision] = useState(0);
	const cursor = useRef(0);
	useEffect(() => {
		let current = true;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const read = async () => {
			setObservation((state) => ({ ...state, reading: true, error: undefined }));
			try {
				const page = await api.run(runId, cursor.current);
				if (!current) return;
				if (page.run.workflowId !== workflowId)
					throw new Error('The run belongs to a different workflow.');
				await activity.observed(runId);
				if (!current) return;
				cursor.current = page.nextSeq;
				setObservation((state) => observe(state, page));
				if (auto && !page.complete && !page.truncated) timer = setTimeout(() => void read(), 2500);
			} catch (error) {
				if (current) setObservation((state) => ({ ...state, reading: false, error }));
			}
		};
		void read();
		return () => {
			current = false;
			if (timer) clearTimeout(timer);
		};
	}, [workflowId, runId, activity, auto, revision]);
	return {
		observation,
		auto,
		toggleAuto: () => setAuto((value) => !value),
		readNext: () => setRevision((value) => value + 1),
	};
}
export function RunDetail({
	workflowId,
	runId,
	activity,
	uncertain = false,
}: {
	workflowId: string;
	runId: string;
	activity: Activity;
	uncertain?: boolean;
}) {
	const { push } = useNavigation();
	const { observation, auto, toggleAuto, readNext } = useRunObservation(
		workflowId,
		runId,
		activity,
	);
	const { run, error } = observation;
	const content = outputText(observation.output);
	const url = resultUrl(observation.output);
	const rows = timeline(observation.events);
	const status = runStatus(observation, uncertain);
	const actions = (
		<>
			<Action
				title={observation.more ? 'Load Next Events' : 'Refresh Run'}
				icon={Icon.ArrowClockwise}
				onAction={readNext}
			/>
			{!observation.complete && (
				<Action
					title={auto ? 'Pause Automatic Refresh' : 'Resume Automatic Refresh'}
					icon={auto ? Icon.Pause : Icon.Play}
					onAction={toggleAuto}
				/>
			)}
			<Action.CopyToClipboard title="Copy Run ID" content={runId} />
			<Action.OpenInBrowser title="Open Workflow in Whenever" url={workflowUrl(workflowId)} />
		</>
	);
	return (
		<List
			isLoading={observation.reading}
			navigationTitle="Run"
			searchBarPlaceholder="Search timeline"
		>
			<List.Section title="Run" subtitle={runId}>
				<List.Item
					title={status.label}
					subtitle={
						run
							? [
									...(run.triggerType === undefined
										? []
										: [startedTriggerLabel(run.triggerType, run.triggerKey)]),
									...(run.version === undefined ? [] : [`v${run.version}`]),
								].join(' · ')
							: undefined
					}
					icon={statusIcon(status)}
					accessories={run ? [{ text: formatTimestamp(run.startedAt) }] : []}
					actions={<ActionPanel>{actions}</ActionPanel>}
				/>
				{run?.failure && (
					<List.Item
						title={run.failure}
						subtitle="Failure"
						icon={statusIcon({ label: 'Failure', tone: 'error' }, Icon.ExclamationMark)}
						actions={<ActionPanel>{actions}</ActionPanel>}
					/>
				)}
				{error !== undefined && (
					<List.Item
						title="Could not read this run"
						subtitle={`${errorMessage(error)} Inspect this run before starting another.`}
						icon={statusIcon({ label: 'Read failed', tone: 'error' }, Icon.Warning)}
						actions={<ActionPanel>{actions}</ActionPanel>}
					/>
				)}
			</List.Section>
			<List.Section title="Timeline">
				{rows.length === 0 && (
					<List.Item
						title="Waiting for the first event…"
						icon={statusIcon({ label: 'Waiting', tone: 'neutral' }, Icon.Circle)}
						actions={<ActionPanel>{actions}</ActionPanel>}
					/>
				)}
				{rows.map((row) => (
					<List.Item
						key={row.key}
						title={row.title}
						subtitle={{ value: row.description, tooltip: row.tooltip ?? null }}
						icon={statusIcon({ label: row.title, tone: row.tone })}
						actions={<ActionPanel>{actions}</ActionPanel>}
					/>
				))}
				{observation.more && (
					<List.Item
						title="More recorded events are available"
						icon={Icon.ArrowDown}
						actions={
							<ActionPanel>
								<Action title="Load Next Events" icon={Icon.ArrowDown} onAction={readNext} />
							</ActionPanel>
						}
					/>
				)}
			</List.Section>
			<List.Section title="Output">
				<List.Item
					title={outputNotice(observation.output)}
					icon={content === undefined ? Icon.Document : Icon.CodeBlock}
					actions={
						<ActionPanel>
							{content !== undefined && (
								<Action
									title="View Output"
									icon={Icon.Eye}
									onAction={() =>
										push(<Detail navigationTitle="Run output" markdown={code(content)} />)
									}
								/>
							)}
							{content !== undefined && (
								<Action.CopyToClipboard title="Copy Result" content={content} />
							)}
							{content !== undefined && <Action.Paste title="Paste Result" content={content} />}
							{url && <Action.OpenInBrowser title="Open Result Link" url={url} />}
							{actions}
						</ActionPanel>
					}
				/>
			</List.Section>
		</List>
	);
}
