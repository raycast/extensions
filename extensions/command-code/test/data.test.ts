import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
	CHATS_ARGS,
	chatsFromRows,
	openLink,
	projectNamesOf,
	projectsFromState,
} from '../src/lib/data.ts';

test('openLink encodes a path with spaces and shows the session', () => {
	const url = new URL(openLink('/Users/a/my app', 'abc-123'));
	assert.equal(url.protocol, 'commandcode:');
	assert.equal(url.host, 'open');
	assert.equal(url.searchParams.get('cwd'), '/Users/a/my app');
	assert.equal(url.searchParams.get('session'), 'abc-123');
	assert.equal(url.searchParams.get('show'), '1');
});

test('openLink leaves the session out for a project', () => {
	const url = new URL(openLink('/code/api'));
	assert.equal(url.searchParams.has('session'), false);
	assert.equal(url.searchParams.has('show'), false);
});

test('chatsFromRows maps a row and skips rows with no id or project', () => {
	const chats = chatsFromRows([
		{
			id: 't1',
			title: '',
			project_path: '/code/api',
			git_branch: 'main',
			unread: 1,
			last_activity_at: 1700000000000.5,
		},
		{id: '', project_path: '/code/api'},
		{id: 't2', project_path: ''},
		'not a row',
	]);
	assert.equal(chats.length, 1);
	assert.equal(chats[0]?.title, 'Untitled chat');
	assert.equal(chats[0]?.projectName, 'api');
	assert.equal(chats[0]?.unread, true);
});

test('the chat query opens the database read-only', () => {
	assert.equal(CHATS_ARGS[0], '-readonly');
});

test('a chat in the root folder keeps a visible project name', () => {
	const chats = chatsFromRows([{id: 't1', project_path: '/'}]);
	assert.equal(chats[0]?.projectName, '/');
});

test('a project in the root folder keeps a visible name', () => {
	const projects = projectsFromState({appState: {projects: ['/']}});
	assert.equal(projects[0]?.name, '/');
});

test('chatsFromRows marks a chat whose folder is gone', () => {
	const chats = chatsFromRows(
		[
			{id: 't1', project_path: '/code/gone'},
			{id: 't2', project_path: '/code/here'},
		],
		path => path === '/code/here',
	);
	assert.deepEqual(
		chats.map(chat => chat.folderMissing),
		[true, false],
	);
});

test('projectsFromState marks a project whose folder is gone', () => {
	const projects = projectsFromState(
		{appState: {projects: ['/code/gone']}},
		() => false,
	);
	assert.equal(projects[0]?.folderMissing, true);
});

test('chatsFromRows shows the renamed project name', () => {
	const chats = chatsFromRows(
		[{id: 't1', project_path: '/code/api'}],
		() => true,
		projectNamesOf({
			appState: {projectNames: {'/code/api': {name: 'Client Portal'}}},
		}),
	);
	assert.equal(chats[0]?.projectName, 'Client Portal');
});

test('chatsFromRows checks each folder once', () => {
	const checked: string[] = [];
	chatsFromRows(
		[
			{id: 't1', project_path: '/code/api'},
			{id: 't2', project_path: '/code/api'},
			{id: 't3', project_path: '/code/web'},
		],
		path => {
			checked.push(path);
			return true;
		},
	);
	assert.deepEqual(checked, ['/code/api', '/code/web']);
});

test('chatsFromRows survives a non-list', () => {
	assert.deepEqual(chatsFromRows(null), []);
});

test('projectsFromState reads objects and plain paths', () => {
	const projects = projectsFromState(
		{appState: {projects: [{path: '/code/api'}, '/code/web', {}]}},
		() => true,
	);
	assert.deepEqual(projects, [
		{path: '/code/api', name: 'api', folderMissing: false},
		{path: '/code/web', name: 'web', folderMissing: false},
	]);
});

test('projectsFromState uses the name a project was renamed to', () => {
	const projects = projectsFromState(
		{
			appState: {
				projects: ['/code/api', '/code/web'],
				projectNames: {
					'/code/api': {name: 'Client Portal', renamedAt: 1},
					'/code/web': {name: '', renamedAt: 2},
				},
			},
		},
		() => true,
	);
	assert.deepEqual(
		projects.map(project => project.name),
		['Client Portal', 'web'],
	);
});

test('projectsFromState survives a missing list', () => {
	assert.deepEqual(projectsFromState({}), []);
});
