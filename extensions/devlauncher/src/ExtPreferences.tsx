import {Application} from "@raycast/api";

export interface ExtPreferences {
	projectsDirectory: string;
	ide: Application;
	ide2: Application;
	ide3: Application;
	recentlyOpenLimit: string;
	projectContainsFilter: string;
	searchDepth: string;
	preferredTerminal: Application;
}