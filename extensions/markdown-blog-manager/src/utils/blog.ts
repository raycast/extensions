import { statSync } from 'fs';
import path from 'path';
import { getPreferences } from './preferences';
import { getRecursiveFiles, getRecursiveDirectories, filenameToTitle } from './utils';
import fs from 'fs-extra';

export interface Post {
	title: string;
	summary: string;
	subdirectory: string;
	extension: string;
	slug: string;
	date: string;
	content: string;
}

export interface MarkdownFile {
	name: string;
	draft: boolean;
	path: string;
	subdirectory: string;
	title: string;
	lastModifiedAt: Date;
	keywords: string[];
}

export type OrganizedPosts = {
	[subdirectory: string]: MarkdownFile[];
};

/**
 * Convert a file path to a MarkdownFile object
 */
function pathToPost(filepath: string, draft: boolean): MarkdownFile {
	const name = path.basename(filepath);
	const contentPaths = [getPreferences().publicPath, getPreferences().draftsPath];
	const relativePath = contentPaths.reduce((acc, root) => {
		return acc.replace(root, '');
	}, filepath);

	const subdirectory = path.basename(path.dirname(relativePath)) || 'Uncategorized';
	return {
		name,
		subdirectory: subdirectory,
		draft,
		path: filepath,
		title: filenameToTitle(name),
		lastModifiedAt: statSync(filepath).mtime,
		keywords: [subdirectory + name],
	};
}

/**
 * Get Public and Draft posts
 */
export function getPosts(): MarkdownFile[] {
	const published = getRecursiveFiles(getPreferences().publicPath);
	const drafts = getRecursiveFiles(getPreferences().draftsPath);

	return [
		...drafts.map((path) => pathToPost(path, true)),
		...published.map((path) => pathToPost(path, false)),
	].sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
}

/**
 * Organize posts by subdirectory
 */
export function getOrganizedPosts(): OrganizedPosts {
	const files = getPosts();

	const subdirectories = files.reduce((acc, file) => {
		if (!acc[file.subdirectory]) {
			acc[file.subdirectory] = [];
		}
		acc[file.subdirectory].push(file);
		return acc;
	}, {} as OrganizedPosts);

	return subdirectories;
}

/**
 * Get all the subdirectories in the content directory
 *
 * @returns {string[]}
 * For example:
 * - /content/drafts/my-subdirectory/my-post.md
 * - /content/drafts/my-subdirectory/my-other-post.md
 * - /content/public/my-other-subdirectory/my-post.md
 *
 * Will return:
 * - ['my-subdirectory', 'my-other-subdirectory']
 */
export function subdirectories(): string[] {
	const { draftsPath, publicPath } = getPreferences();

	const paths = [draftsPath, publicPath];

	const subdirectories = new Set<string>();
	return Array.from(
		paths.reduce((acc, postPath) => {
			const directories = getRecursiveDirectories(postPath);
			directories.forEach((dir) => acc.add(path.basename(dir)));
			return acc;
		}, subdirectories)
	);
}

export function publishPost(post: MarkdownFile): void {
	const { draftsPath, publicPath } = getPreferences();

	if (!post.path.startsWith(draftsPath)) {
		throw new Error(`Cannot publish post that is not in drafts directory`);
	}

	const newPostPath = post.path.replace(draftsPath, publicPath);

	// Set the current date in the post content.
	const content = fs.readFileSync(post.path, 'utf8');
	const today = new Date().toISOString().split('T')[0];
	const updatedContent = content.replace(/^date:.*$/gim, `date: ${today}`);

	fs.ensureDirSync(path.dirname(newPostPath));
	fs.writeFileSync(newPostPath, updatedContent);
	fs.unlinkSync(post.path);
}

export function createDraft(post: Post): string {
	let subdirectory = '';

	const postPath = path.join(
		getPreferences().draftsPath,
		subdirectory,
		`${post.slug}.${post.extension}`
	);
	if (post.subdirectory) {
		subdirectory = post.subdirectory + '/';
	}

	fs.ensureDirSync(path.dirname(postPath));
	fs.writeFileSync(postPath, post.content);

	return postPath;
}
