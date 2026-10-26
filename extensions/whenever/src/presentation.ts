import type { Run, Trigger, Workflow } from './api.ts';
import { md } from './format.ts';

export type Tone = 'success' | 'warning' | 'error' | 'accent' | 'neutral';
export type Presentation = { label: string; tone: Tone; description?: string };
export const TONE_COLOR: Record<Tone, { light: string; dark: string }> = {
	success: { light: '#006B57', dark: '#7FE0C4' },
	warning: { light: '#6B4E00', dark: '#FFD166' },
	error: { light: '#8A1F11', dark: '#FF9E8A' },
	accent: { light: '#7C3AED', dark: '#B69CFF' },
	neutral: { light: '#5A5851', dark: '#C9C9C9' },
};

const WORKFLOW_STATUS = {
	draft: { label: 'Draft', tone: 'neutral', description: 'This workflow is not turned on' },
	published: {
		label: 'Turned On',
		tone: 'neutral',
		description: 'A version is turned on, but live activation is not confirmed',
	},
	activating: {
		label: 'Activating',
		tone: 'accent',
		description: 'Workflow triggers are being configured',
	},
	active: {
		label: 'Active',
		tone: 'success',
		description: 'Triggers are configured and this workflow can run',
	},
	degraded: {
		label: 'Degraded',
		tone: 'warning',
		description: 'This workflow can run, but activation reported degraded health',
	},
	paused: { label: 'Paused', tone: 'neutral', description: 'Workflow triggers are paused' },
	'setup-required': {
		label: 'Setup required',
		tone: 'warning',
		description: 'Complete the required setup before this workflow can become active',
	},
	'plan-paused': {
		label: 'Paused — plan limit',
		tone: 'warning',
		description:
			'Your plan runs fewer workflows at once than this account has turned on, so this one will not run until you upgrade or turn it on again',
	},
} satisfies Record<string, Presentation>;
const PLAN_PAUSE_PRIORITY = ['schedule-limit', 'connection-limit', 'check-failed'] as const;
const PLAN_PAUSE_DESCRIPTION: Record<(typeof PLAN_PAUSE_PRIORITY)[number], string> = {
	'schedule-limit':
		'Free workflows can start at most one scheduled run per day, so this workflow will not run until you reduce its schedule and turn it on again or upgrade to Pro',
	'connection-limit':
		'Your account has more connections and saved values than Free allows, so this workflow will not run until you remove some in Setup and turn it on again or upgrade to Pro',
	'check-failed':
		'We could not check this workflow against your plan, so it will not run until you turn it on again',
};
export type WorkflowStatus = keyof typeof WORKFLOW_STATUS;

export function workflowStatus(workflow: Workflow): WorkflowStatus {
	if (workflow.planPaused) return 'plan-paused';
	if (workflow.deployedVersion === undefined) return 'draft';
	return workflow.activation ?? 'published';
}
export function workflowPresentation(workflow: Workflow): Presentation {
	const status = workflowStatus(workflow);
	const cause = PLAN_PAUSE_PRIORITY.find((item) => workflow.planPauseCauses.includes(item));
	return status === 'plan-paused' && cause !== undefined
		? { ...WORKFLOW_STATUS[status], description: PLAN_PAUSE_DESCRIPTION[cause] }
		: WORKFLOW_STATUS[status];
}

const RUN_STATUS: Record<Run['status'], Presentation> = {
	running: { label: 'Running', tone: 'warning' },
	succeeded: { label: 'Succeeded', tone: 'success' },
	failed: { label: 'Failed', tone: 'error' },
	timed_out: { label: 'Timed out', tone: 'error' },
	cancelled: { label: 'Cancelled', tone: 'neutral' },
};
export const NEVER_STARTED: Presentation = { label: 'Did not start', tone: 'error' };
export const runStatusPresentation = (status: Run['status']) => RUN_STATUS[status];
export const runPresentation = (run: Pick<Run, 'status' | 'version'>): Presentation =>
	run.status === 'failed' && run.version === undefined ? NEVER_STARTED : RUN_STATUS[run.status];

const TRIGGER_LABEL: Record<string, string> = {
	manual: 'Manual',
	schedule: 'Schedule',
	once: 'One-off schedule',
	webhook: 'Webhook',
	event: 'Event',
};
export const triggerLabel = (type: string) => TRIGGER_LABEL[type] ?? type;
export function startedTriggerLabel(type: string, key?: string) {
	return key === undefined ? triggerLabel(type) : `${key} (${triggerLabel(type).toLowerCase()})`;
}
export function runDescription(run: Run) {
	return [
		runPresentation(run).label,
		...(run.triggerType === undefined ? [] : [triggerLabel(run.triggerType)]),
		...(run.version === undefined ? [] : [`v${run.version}`]),
	].join(' · ');
}

export function formatDuration(ms: number) {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	const seconds = Math.round(ms / 1000);
	return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
export function formatTimestamp(ms: number, timeZone?: string) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
		timeZoneName: 'short',
		...(timeZone === undefined ? {} : { timeZone }),
	}).format(ms);
}
export function formatTime(ms: number, timeZone?: string) {
	return new Intl.DateTimeFormat('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
		...(timeZone === undefined ? {} : { timeZone }),
	}).format(ms);
}
export function formatClock(ms: number, timeZone?: string) {
	return new Intl.DateTimeFormat('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		fractionalSecondDigits: 3,
		hourCycle: 'h23',
		timeZoneName: 'short',
		...(timeZone === undefined ? {} : { timeZone }),
	}).format(ms);
}

export type RunFields = { input: boolean; trigger: 'hidden' | 'typed' | Trigger[] };
export function runFields(source: { usesInput?: boolean; triggers?: Trigger[] }): RunFields {
	const { triggers } = source;
	return {
		input: source.usesInput !== false,
		trigger: triggers === undefined ? 'typed' : triggers.length > 1 ? triggers : 'hidden',
	};
}
export function runTrigger(trigger: RunFields['trigger'], picked: string): string | undefined {
	if (trigger === 'hidden') return undefined;
	if (trigger === 'typed') return picked.trim() || undefined;
	return trigger.some((choice) => choice.key === picked) ? picked : trigger[0]?.key;
}

const APP_NAMES: Record<string, string> = {
	ai: 'AI',
	airtable: 'Airtable',
	asana: 'Asana',
	calendly: 'Calendly',
	clickup: 'ClickUp',
	confluence: 'Confluence',
	discord: 'Discord',
	dropbox: 'Dropbox',
	figma: 'Figma',
	github: 'GitHub',
	gitlab: 'GitLab',
	gmail: 'Gmail',
	googlecalendar: 'Google Calendar',
	googledocs: 'Google Docs',
	googledrive: 'Google Drive',
	googlesheets: 'Google Sheets',
	http: 'HTTP',
	hubspot: 'HubSpot',
	intercom: 'Intercom',
	jira: 'Jira',
	linear: 'Linear',
	mailchimp: 'Mailchimp',
	mcp: 'MCP',
	notion: 'Notion',
	outlook: 'Outlook',
	postgres: 'Postgres',
	salesforce: 'Salesforce',
	shopify: 'Shopify',
	slack: 'Slack',
	slackbot: 'Slack',
	stripe: 'Stripe',
	stripe_app: 'Stripe',
	telegram: 'Telegram',
	todoist: 'Todoist',
	trello: 'Trello',
	typeform: 'Typeform',
	whatsapp: 'WhatsApp',
	zendesk: 'Zendesk',
	zoom: 'Zoom',
};
const appName = (provider: string) =>
	APP_NAMES[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1).replaceAll('_', ' ');
export function appNames(integrations: string[]) {
	const names = integrations.map((id) => appName(id.split('.')[0] ?? id));
	return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}
export function formatDate(iso: string, timeZone?: string) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		...(timeZone === undefined ? {} : { timeZone }),
	}).format(new Date(iso));
}
export type WorkflowFacts = {
	triggers?: Trigger[];
	integrations?: string[];
	runs?: Run[];
	runsFailed?: boolean;
};
export function workflowMarkdown(workflow: Workflow, facts: WorkflowFacts) {
	const status = workflowPresentation(workflow);
	const lines: string[] = [];
	if (facts.triggers !== undefined)
		lines.push(
			`- **Runs on** ${facts.triggers.length === 0 ? 'No declared triggers' : facts.triggers.map((t) => md(startedTriggerLabel(t.type, t.key))).join(' · ')}`,
		);
	const apps = appNames(facts.integrations ?? []);
	if (apps.length > 0) lines.push(`- **Uses** ${apps.map(md).join(', ')}`);
	const last = [...(facts.runs ?? [])].sort((a, b) => b.startedAt - a.startedAt)[0];
	if (facts.runsFailed) lines.push('- **Last run** Could not be read');
	else if (facts.runs !== undefined)
		lines.push(
			`- **Last run** ${
				last === undefined
					? 'No runs yet'
					: [
							runPresentation(last).label,
							formatTimestamp(last.startedAt),
							...(last.endedAt === undefined
								? []
								: [formatDuration(last.endedAt - last.startedAt)]),
						].join(' · ')
			}`,
		);
	return [
		`# ${md(workflow.name)}`,
		...(workflowStatus(workflow) === 'active'
			? []
			: [`${md(status.description ?? status.label)}.`]),
		...(lines.length > 0 ? [lines.join('\n')] : []),
	].join('\n\n');
}
