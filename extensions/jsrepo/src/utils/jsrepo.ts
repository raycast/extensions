import type { Block, RegistryProvider, RegistryProviderState } from "jsrepo";
import * as array from "../utils/array";
import { LocalStorage } from "@raycast/api";
import type { Preferences } from "../preferences";

export function determinePrimaryLanguage(...blocks: Block[]) {
	const langMap = new Map<string, number>();

	const ifExistsIncrement = (key: string) => {
		const val = langMap.get(key) ?? 0;

		langMap.set(key, val + 1);
	};

	for (const block of blocks) {
		for (const file of block.files) {
			const ext = parseFileExtension(file);

			if (ext === "yaml" || ext === "yml") {
				ifExistsIncrement("yml");
				continue;
			}

			if (ext === "json" || ext === "jsonc") {
				ifExistsIncrement("json");
				continue;
			}

			if (ext === "sass" || ext === "scss") {
				ifExistsIncrement("sass");
				continue;
			}

			if (blocks.length === 1) {
				// framework always takes priority
				if (
					ext === "svelte" ||
					ext === "tsx" ||
					ext === "jsx" ||
					ext === "vue"
				)
					return ext;
			}

			ifExistsIncrement(ext);
		}
	}

	const arr = array
		.fromMap(langMap, (key, value) => ({ key, value }))
		.toSorted((a, b) => b.value - a.value);

	return arr[0]?.key ?? "unknown";
}

export function parseFileExtension(file: string) {
	const index = file.lastIndexOf(".");

	return file.slice(index + 1);
}

export function getIconForBlock(block: Block) {
	const lang = determinePrimaryLanguage(block);

	return `langs/${lang}.svg`;
}

export function getToken(preferences: Preferences, provider: RegistryProvider) {
	switch (provider.name) {
		case "github":
			return preferences.github_token;
		case "gitlab":
			return preferences.gitlab_token;
		case "bitbucket":
			return preferences.bitbucket_token;
		case "azure":
			return preferences.azure_token;
		default:
			return undefined;
	}
}

export function getStateCacheKey(url: string) {
	return `state:${url}`;
}

export async function getRegistryState(
	url: string,
	provider: RegistryProvider,
	preferences: Preferences,
): Promise<RegistryProviderState> {
	const key = getStateCacheKey(url);

	const stored = await LocalStorage.getItem<string>(key);

	let state = stored ? JSON.parse(stored) : undefined;

	if (state) return { ...state, provider };

	state = await provider.state(url, {
		token: getToken(preferences, provider),
	});

	await LocalStorage.setItem(
		key,
		JSON.stringify({ ...state, provider: undefined }),
	);

	return state;
}

const TEST_SUFFIXES = [
	".test.ts",
	"_test.ts",
	".test.js",
	"_test.js",
	".spec.ts",
	"_spec.ts",
	".spec.js",
	"_spec.js",
	".stories.jsx",
	"_stories.jsx",
	".stories.tsx",
	"_stories.tsx",
] as const;

export function isTestFile(file: string) {
	return TEST_SUFFIXES.find((suffix) => file.endsWith(suffix)) !== undefined;
}
