import {Action, ActionPanel, Application, getPreferenceValues, Icon, List, showToast, Toast} from "@raycast/api";
import {useCachedPromise, useExec} from "@raycast/utils";

import path from "path";
import {HistoryService} from "./history";
import {FunctionReturningPromise} from "@raycast/utils/dist/types";
import * as os from "os";
import {PinnedProjectsService} from "./pinned";
import {ExtPreferences} from "./ExtPreferences";

interface ProjectItemProperties {
	project: DirectoryInfo;
	preferences: ExtPreferences;
	additionalActions?: (path: string) => React.ReactNode[];
	key?: string;
}

interface SubSectionProperties {
	title: string;
	subSectionItems: string[];
	additionalActions?: (path: string) => React.ReactNode[];
}

interface DirectoryInfo {
	path: string;
	name: string;
	parent: string;
}

interface DirectoryMap {
	[parent: string]: DirectoryInfo[];
}

export default function Command() {
	const preferences = getPreferenceValues<ExtPreferences>();
	const history = nullSafeUseCachedPromise(HistoryService.getHistory);
	const pinnedProjects = nullSafeUseCachedPromise(PinnedProjectsService.getPinned);

	const includeFilters = preferences.projectContainsFilter;
	const pruneDirectories = "'*/node_modules'";
	const directoriesToSearch = preferences.projectsDirectory.replace(";", "\\ ");
	console.log(preferences);
	const {data: directories, isLoading} = useExec(
		"find",
		[
			directoriesToSearch,
			"-maxdepth",
			preferences.searchDepth,
			"-type",
			"d",
			"\\(",
			"-path",
			pruneDirectories,
			"-prune",
			"\\)",
			"-or",
			"\\(",
			convertToFindFilter(includeFilters),
			"\\)",
			"|",
			"xargs",
			"-I",
			"{}",
			"dirname",
			"{} | uniq",
		],
		{
			shell: true,
			parseOutput(args) {
				return args.stdout
					.split("\n")
					.filter((line) => line.trim())
					.reduce((acc: DirectoryMap, path: string) => {
						const directoryInfo = extractDirectoryInfo(path);
						if (!acc[directoryInfo.parent]) {
							acc[directoryInfo.parent] = [];
						}
						acc[directoryInfo.parent].push(directoryInfo);
						return acc;
					}, {});
			},
		}
	);

	validateDirectoriesFound(directories);

	return (
		<List isLoading={isLoading}>
			{pinnedProjects.length > 0 &&
				storedSection(
					{
						title: "Pinned Items",
						subSectionItems: pinnedProjects,
						additionalActions: (key) => [
							<Action
								key={"Unpin"}
								title={"Unpin"}
								onAction={async () => PinnedProjectsService.removePinnedItem(key)}
							/>,
						],
					},
					preferences
				)}
			{history.length > 0 &&
				storedSection(
					{
						title: "Recently Opened",
						subSectionItems: history,
						additionalActions: () => [
							<Action
								key={"ClearHistory"}
								title={"Clear History"}
								icon={Icon.Trash}
								onAction={async () => HistoryService.clearHistory()}
							/>,
						],
					},
					preferences
				)}
			{directories &&
				Object.keys(directories).map((dirName) => (
					<List.Section title={dirName} key={dirName}>
						{directories[dirName].map((project) =>
							getProjectItem({
								project: project,
								key: project.path,
								preferences: preferences,
								additionalActions: (key) => [
									<Action
										key={"Pinned" + "-" + project.path}
										title={"Pin"}
										icon={Icon.Pin}
										onAction={async () => PinnedProjectsService.pinItem(key)}
									/>,
								],
							})
						)}
					</List.Section>
				))}
		</List>
	);
}

function extractDirectoryInfo(directoryPath: string): DirectoryInfo {
	const fullPath = path.resolve(directoryPath); // Ensures we have the absolute path
	const name = path.basename(fullPath); // Gets the directory name
	const parent = path.basename(path.dirname(fullPath)); // Gets the parent directory name

	return {path: fullPath, parent: parent, name: name};
}

function nullSafeUseCachedPromise<T extends FunctionReturningPromise<[]>>(fn: T): string[] {
	const {data: cachedPromise} = useCachedPromise(fn);
	if (cachedPromise) {
		return cachedPromise;
	}
	return [];
}

function storedSection(subSection: SubSectionProperties, preferences: ExtPreferences) {
	return (
		<List.Section title={subSection.title}>
			{subSection.subSectionItems.map((projectPath) => {
				return getProjectItem({
					project: extractDirectoryInfo(projectPath),
					preferences: preferences,
					additionalActions: subSection.additionalActions,
					key: subSection.title + "-" + projectPath,
				});
			})}
		</List.Section>
	);
}

function convertToFindFilter(includeFilters: string) {
	return includeFilters
		.split(";")
		.map((filter) => "-name " + filter)
		.join(" -or ");
}

function validateDirectoriesFound(directories: DirectoryMap | undefined) {
	if (!directories || Object.values(directories).every((directory) => directory.length === 0)) {
		showToast({
			style: Toast.Style.Failure,
			title: "Couldn't find any directories to open",
			message: `Please check the if the file filters are defined properly`,
		}).then((r) => r.show());
	}
}

function getProjectItem({project, preferences, additionalActions, key = project.path}: ProjectItemProperties) {
	function openActionString(application: string) {
		return (
			<Action.Open
				target={project.path}
				title={"Open with " + application}
				application={application}
				onOpen={async () => await HistoryService.saveToHistory(preferences, project.path)
				}
			/>
		);
	}

	function openAction(application: Application) {
		return (
			<Action.Open
				target={project.path}
				title={"Open with " + application.name}
				application={application}
				onOpen={async () => await HistoryService.saveToHistory(preferences, project.path)
				}
			/>
		);
	}

	return (
		<List.Item
			key={key}
			icon="extension_icon.png"
			title={project.name}
			accessories={[{text: project.path.replace(os.homedir(), "~"), icon: Icon.Folder}]}
			actions={
				<ActionPanel>
					<ActionPanel.Section title={"Open With"}>
						{openAction(preferences.ide)}
						{preferences.ide2 && openAction(preferences.ide2)}
						{preferences.ide3 && openAction(preferences.ide3)}
						{openActionString("Terminal")}
						{openActionString("Finder")}
					</ActionPanel.Section>
					<ActionPanel.Section title={"Miscellaneous"}>
						{additionalActions && additionalActions(project.path)}
						<Action.CopyToClipboard title="Copy Link" content={project.path}/>
						<Action.ShowInFinder path={project.path}/>
					</ActionPanel.Section>
				</ActionPanel>
			}
		/>
	);
}
