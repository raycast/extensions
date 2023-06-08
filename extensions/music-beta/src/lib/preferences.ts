import { getPreferenceValues } from "@raycast/api";
import { z } from "zod";

const preferencesSchema = z.object({
	volumeSteps: z.number({ coerce: true }).default(10),
	sendAnonymousUsageData: z.boolean().default(true),
	closeMainWindowOnControls: z.boolean().default(true),
	enhancedFeedback: z.boolean().default(true),
	displayArtwork: z.boolean().default(false),
	displayTitle: z.boolean().default(true),
	maxTitleLength: z.number({ coerce: true }).default(-1),
	recommendations_displayAsList: z.boolean().default(false),
	search_displayAsList: z.boolean().default(false),
	experimental_music_api: z.boolean().default(true),
});

export type IPreferences = z.infer<typeof preferencesSchema>;

const getPreferences = () => preferencesSchema.parse(getPreferenceValues());

export class Preferences {
	static get<K extends keyof IPreferences = keyof IPreferences>(key: K): IPreferences[K] {
		return getPreferences()[key];
	}

	static getAll() {
		return getPreferences();
	}

	static get experimental_music_api() {
		return Preferences.get("experimental_music_api");
	}

	static volume = {
		get step(): number {
			return Preferences.get("volumeSteps");
		},
	};

	static get sendAnonymousUsageData(): boolean {
		return Preferences.get("sendAnonymousUsageData");
	}

	static get closeMainWindowOnControls(): boolean {
		return Preferences.get("closeMainWindowOnControls");
	}

	static get enhancedFeedback(): boolean {
		return Preferences.get("enhancedFeedback");
	}

	static currentlyPlaying = {
		get displayArtowrk(): boolean {
			return Preferences.get("displayArtwork");
		},

		get displayTitle(): boolean {
			return Preferences.get("displayTitle");
		},

		get maxTitleLength(): number {
			return Preferences.get("maxTitleLength");
		},
	};

	static recommendations = {
		get displayAsList(): boolean {
			return Preferences.get("recommendations_displayAsList");
		},
	};

	static search = {
		get displayAsList(): boolean {
			return Preferences.get("search_displayAsList");
		},
	};
}
