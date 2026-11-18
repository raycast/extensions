import { randomUUID } from 'node:crypto';
import { useCallback, useRef, useState } from 'react';
import {
	Action,
	ActionPanel,
	Clipboard,
	Form,
	Icon,
	Toast,
	confirmAlert,
	getSelectedText,
	showToast,
	useNavigation,
} from '@raycast/api';
import { launchRun, type Activity } from './activity.ts';
import { LaunchUncertain, parseInput, type Workflow } from './api.ts';
import { api } from './auth.ts';
import { ErrorView } from './error-view.tsx';
import { errorMessage } from './format.ts';
import { runFields, runTrigger, type RunFields } from './presentation.ts';
import { RunDetail } from './run-detail.tsx';
import { useLoad } from './use-load.ts';
import { workflowUrl } from './urls.ts';

export function RunForm({ workflow, activity }: { workflow: Workflow; activity: Activity }) {
	const { push, pop } = useNavigation();
	const state = useLoad(useCallback(() => api.workflow(workflow.id), [workflow.id]));
	const [input, setInput] = useState('');
	const [trigger, setTrigger] = useState('');
	const [error, setError] = useState<string>();
	const [busy, setBusy] = useState(false);
	const dispatching = useRef(false);
	const fields: RunFields = state.data
		? runFields(state.data)
		: { input: false, trigger: 'hidden' };
	const chosenTrigger = runTrigger(fields.trigger, trigger);
	const importText = async (source: 'clipboard' | 'selection') => {
		try {
			const value = source === 'clipboard' ? await Clipboard.readText() : await getSelectedText();
			if (!value) throw new Error('No text is available.');
			setInput(JSON.stringify({ text: value }, null, 2));
			setError(undefined);
		} catch (error) {
			await showToast({
				style: Toast.Style.Failure,
				title: 'Could not read text',
				message: errorMessage(error),
			});
		}
	};
	const showRun = (runId: string, uncertain = false) => {
		pop();
		push(
			<RunDetail
				workflowId={workflow.id}
				runId={runId}
				activity={activity}
				uncertain={uncertain}
			/>,
		);
	};
	const submit = async () => {
		const version = state.data?.version;
		if (dispatching.current || version === undefined) return;
		let parsed: unknown;
		try {
			parsed = fields.input ? parseInput(input) : undefined;
			setError(undefined);
		} catch (error) {
			setError(errorMessage(error));
			return;
		}
		dispatching.current = true;
		setBusy(true);
		try {
			if (
				!(await confirmAlert({
					title: `Run ${workflow.name}?`,
					message: `Run saved version ${version}${version !== state.data?.deployedVersion ? ' (different from the published version)' : ''}. This may change external accounts.${fields.input ? ' Review the input before confirming.' : ''}`,
					primaryAction: { title: 'Run Saved Version' },
				}))
			)
				return;
			const result = await launchRun(api, activity, {
				workflowId: workflow.id,
				version,
				runId: randomUUID(),
				input: parsed,
				...(chosenTrigger ? { triggerKey: chosenTrigger } : {}),
			});
			showRun(result.runId);
		} catch (error) {
			if (error instanceof LaunchUncertain) showRun(error.runId, true);
			else
				await showToast({
					style: Toast.Style.Failure,
					title: 'Run was not started',
					message: errorMessage(error),
				});
		} finally {
			dispatching.current = false;
			setBusy(false);
		}
	};
	if (state.error) return <ErrorView error={state.error} retry={state.reload} />;
	return (
		<Form
			isLoading={state.busy || busy}
			navigationTitle={`Run ${workflow.name}`}
			actions={
				<ActionPanel>
					<Action.SubmitForm title="Review and Run" icon={Icon.Play} onSubmit={submit} />
					{fields.input ? (
						<>
							<Action
								title="Use Clipboard as Text Input"
								icon={Icon.Clipboard}
								onAction={() => importText('clipboard')}
							/>
							<Action
								title="Use Selected Text as Input"
								icon={Icon.Text}
								onAction={() => importText('selection')}
							/>
						</>
					) : null}
					<Action
						title="Refresh Saved Version"
						icon={Icon.ArrowClockwise}
						onAction={state.reload}
					/>
					<Action.OpenInBrowser title="Open Workflow in Whenever" url={workflowUrl(workflow.id)} />
				</ActionPanel>
			}
		>
			<Form.Description
				title="Version"
				text={
					state.data?.version === undefined
						? 'No saved version. Save the workflow in Whenever before running it.'
						: `Saved version ${state.data.version} · published version ${state.data.deployedVersion ?? 'none'}`
				}
			/>
			<Form.Description
				title="Execution"
				text={
					fields.input
						? 'This runs the saved draft and may change external accounts. Clipboard and selected text are inserted as { text: … }; adjust the JSON to match your workflow.'
						: 'This runs the saved draft and may change external accounts.'
				}
			/>
			{fields.input ? (
				<Form.TextArea
					id="input"
					title="JSON Input"
					value={input}
					onChange={(value) => {
						setInput(value);
						setError(undefined);
					}}
					error={error}
					placeholder={'{ "text": "Hello" }'}
				/>
			) : null}
			{Array.isArray(fields.trigger) ? (
				<Form.Dropdown
					id="trigger"
					title="Trigger"
					value={chosenTrigger}
					onChange={setTrigger}
					info="The declared trigger this run stands in for."
				>
					{fields.trigger.map((choice) => (
						<Form.Dropdown.Item
							key={choice.key}
							value={choice.key}
							title={`${choice.key} · ${choice.type}`}
						/>
					))}
				</Form.Dropdown>
			) : null}
			{fields.trigger === 'typed' ? (
				<Form.TextField
					id="trigger"
					title="Trigger Key"
					value={trigger}
					onChange={setTrigger}
					placeholder="Optional for a single trigger"
					info="For workflows with multiple triggers, enter the declared trigger key from your workflow."
				/>
			) : null}
		</Form>
	);
}
