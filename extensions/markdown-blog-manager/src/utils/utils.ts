import { globbySync } from 'globby';

let memcache: Record<string, string[]> = {};

function cachedGlobby(dir: string, pattern: string, opts = {}) {
	const cacheKey = `${dir}:${pattern}`;
	if (!(cacheKey in memcache) || memcache[cacheKey].length === 0) {
		memcache[cacheKey] = globbySync(`${dir}/${pattern}`, {
			ignore: ['**/node_modules/**', '**/.git/**', '**/.DS_Store'],
			ignoreFiles: `${dir}/.ray-ignore`,
			...opts,
		});
	}
	return memcache[cacheKey];
}

export function clearFileCache() {
	memcache = {};
}

export function getRecursiveFiles(dir: string): string[] {
	return cachedGlobby(dir, `**/*.{md,mdx}`);
}

export function getRecursiveDirectories(dir: string): string[] {
	return cachedGlobby(dir, `**/*`, {
		onlyDirectories: true,
	});
}

export function capitalize(text: string) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export function titleToSlug(title: string) {
	return title
		.toLowerCase()
		.replace(/ /g, '-')
		.replace(/[^\w-]+/g, '');
}

/**
 * Reverse engineer what a post title could look like without reading the file.
 */
export function filenameToTitle(name: string) {
	return name
		.replace(/_/g, ' ')
		.replace(/-/g, ' ')
		.replace(/\.mdx?$/, '')
		.replace(/\b\w/g, (l) => l.toUpperCase());
}
