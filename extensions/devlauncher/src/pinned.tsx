import {LocalStorage} from "@raycast/api";

export class PinnedProjectsService {
	private static pinnedProjectsStorageKey = "pinned";

	static async pinItem(project: string) {
		const pinnedProjectsString = await LocalStorage.getItem<string>(PinnedProjectsService.pinnedProjectsStorageKey);
		const pinnedProjects = pinnedProjectsString ? pinnedProjectsString?.split(";") : [];

		if (!pinnedProjects.includes(project)) {
			pinnedProjects.push(project);
		}

		await LocalStorage.setItem(PinnedProjectsService.pinnedProjectsStorageKey, pinnedProjects?.join(";"));
	}

	static async getPinned(): Promise<string[]> {
		const pinnedProjectsString = await LocalStorage.getItem<string>(PinnedProjectsService.pinnedProjectsStorageKey);
		return pinnedProjectsString ? pinnedProjectsString?.split(";") : [];
	}

	static async clearPinnedItems() {
		await LocalStorage.removeItem(PinnedProjectsService.pinnedProjectsStorageKey);
	}

	static async removePinnedItem(project: string) {
		const pinnedProjectsString = await LocalStorage.getItem<string>(PinnedProjectsService.pinnedProjectsStorageKey);
		const pinnedProjects = pinnedProjectsString ? pinnedProjectsString?.split(";") : [];

		await LocalStorage.setItem(PinnedProjectsService.pinnedProjectsStorageKey,
			pinnedProjects.filter(key => key !== project).join(";"));
	}

}