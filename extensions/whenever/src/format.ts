import { SignInRequired } from './api.ts';

export const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : 'The request failed. Try again.';
const ENTITIES: Record<string, string> = { '&': '&amp;', '[': '&#91;', ']': '&#93;', $: '&#36;' };
export const md = (value: string) =>
	value.replace(/[\\`*_{}<>!#|]/g, '\\$&').replace(/[&[\]$]/g, (char) => ENTITIES[char] ?? char);
export const code = (value: string) => '```json\n' + value.replace(/```/g, '`​``') + '\n```';
export const humanize = (value: string) => value.replaceAll('_', ' ');
export function errorMarkdown(error: unknown, hint?: string) {
	const title = error instanceof SignInRequired ? 'Connect Whenever' : 'Could not load Whenever';
	return [`# ${title}`, md(errorMessage(error)), ...(hint ? [hint] : [])].join('\n\n');
}
