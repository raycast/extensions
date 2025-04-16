import {getPreferenceValues, LocalStorage} from "@raycast/api";
import {ExtPreferences} from "./ExtPreferences";

export class HistoryService {
	private static historyStorageKey = "history";

	static async saveToHistory(preferences: ExtPreferences, projectPath: string) {
		const historyLimit = parseInt(preferences.recentlyOpenLimit) || 0;
		const historyString:string | undefined = await LocalStorage.getItem<string>(HistoryService.historyStorageKey);
		const history = historyString ? historyString?.split(";") : [];

		if (!history.includes(projectPath)) {
			history.push(projectPath);
		}

		LocalStorage.setItem("history", history.slice(0, historyLimit).join(";"));
	}

	static async getHistory(): Promise<string[]> {
		const history = await LocalStorage.getItem<string>(HistoryService.historyStorageKey);
		return history ? history?.split(";") : [];
	}

	static async clearHistory() {
		await LocalStorage.removeItem(HistoryService.historyStorageKey);
	}

}