import {execFile} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {basename, join} from 'node:path';
import {promisify} from 'node:util';

const APP_DATA = join(homedir(), 'Library/Application Support/Command Code');
const THREAD_DB = join(APP_DATA, 'thread-index.db');
const APP_STATE = join(APP_DATA, 'app-state.json');
const SQLITE = '/usr/bin/sqlite3';
// shortcut: only the newest 500 chats are searchable, move search into SQL if anyone reaches the limit.
const MAX_CHATS = 500;
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

const CHATS_QUERY = `
	SELECT id, title, project_path, git_branch, unread, last_activity_at
	FROM threads
	WHERE project_path != '' AND has_transcript = 1
	ORDER BY last_activity_at DESC
	LIMIT ${MAX_CHATS}
`;

// -readonly: the app owns this database, so the extension must never write.
export const CHATS_ARGS = [
	'-readonly',
	'-json',
	THREAD_DB,
	CHATS_QUERY,
] as const;

type ProjectNames = Readonly<Record<string, unknown>>;

export interface Chat {
	readonly id: string;
	readonly title: string;
	readonly projectPath: string;
	readonly projectName: string;
	readonly branch: string;
	readonly unread: boolean;
	readonly lastActivityAt: number;
	readonly folderMissing: boolean;
}

export interface Project {
	readonly path: string;
	readonly name: string;
	readonly folderMissing: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (typeof value !== 'object' || value === null) return null;
	return value as Record<string, unknown>;
}

function textOf(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

// shortcut: renames match the exact path, so another spelling of a folder shows its folder name, port the app's path matching if that gets reported.
function displayName(path: string, projectNames: ProjectNames): string {
	const renamed = textOf(asRecord(projectNames[path])?.name);
	return renamed || basename(path) || path;
}

/** Project path to the name the sidebar shows; an empty name means no rename. */
export function projectNamesOf(state: unknown): ProjectNames {
	const appState = asRecord(asRecord(state)?.appState);
	return asRecord(appState?.projectNames) ?? {};
}

/** The app creates this folder the first time it opens. */
export function hasAppData(): boolean {
	return existsSync(APP_DATA);
}

/**
 * `show=1` selects a chat as it stands. Without it the app treats the link as a
 * CLI handoff and clears the chat's branch and worktree.
 */
export function openLink(projectPath: string, sessionId?: string): string {
	const params = new URLSearchParams({cwd: projectPath});
	if (sessionId) {
		params.set('session', sessionId);
		params.set('show', '1');
	}
	return `commandcode://open?${params.toString()}`;
}

export function chatsFromRows(
	rows: unknown,
	folderExists: (path: string) => boolean = existsSync,
	projectNames: ProjectNames = {},
): readonly Chat[] {
	if (!Array.isArray(rows)) return [];
	// Many chats share a folder, and a check blocks on a slow network drive.
	const checked = new Map<string, boolean>();
	const isMissing = (path: string): boolean => {
		if (!checked.has(path)) checked.set(path, folderExists(path));
		return !checked.get(path);
	};
	return rows.flatMap((raw): Chat[] => {
		const row = asRecord(raw);
		const id = textOf(row?.id);
		const projectPath = textOf(row?.project_path);
		if (!id || !projectPath) return [];
		return [
			{
				id,
				title: textOf(row?.title) || 'Untitled chat',
				projectPath,
				projectName: displayName(projectPath, projectNames),
				branch: textOf(row?.git_branch),
				unread: row?.unread === 1,
				lastActivityAt: Number(row?.last_activity_at) || 0,
				folderMissing: isMissing(projectPath),
			},
		];
	});
}

export function projectsFromState(
	state: unknown,
	folderExists: (path: string) => boolean = existsSync,
): readonly Project[] {
	const appState = asRecord(asRecord(state)?.appState);
	const projects = appState?.projects;
	if (!Array.isArray(projects)) return [];
	const projectNames = projectNamesOf(state);
	return projects.flatMap((raw): Project[] => {
		const path = typeof raw === 'string' ? raw : textOf(asRecord(raw)?.path);
		if (!path) return [];
		return [
			{
				path,
				name: displayName(path, projectNames),
				folderMissing: !folderExists(path),
			},
		];
	});
}

/** Names are cosmetic, so an unreadable state file must not hide the chats. */
async function loadProjectNames(): Promise<ProjectNames> {
	try {
		return projectNamesOf(JSON.parse(await readFile(APP_STATE, 'utf8')));
	} catch {
		return {};
	}
}

export async function loadChats(): Promise<readonly Chat[]> {
	const [{stdout}, projectNames] = await Promise.all([
		promisify(execFile)(SQLITE, CHATS_ARGS, {maxBuffer: MAX_OUTPUT_BYTES}),
		loadProjectNames(),
	]);
	const rows: unknown = stdout.trim() ? JSON.parse(stdout) : [];
	return chatsFromRows(rows, existsSync, projectNames);
}

export async function loadProjects(): Promise<readonly Project[]> {
	return projectsFromState(JSON.parse(await readFile(APP_STATE, 'utf8')));
}
