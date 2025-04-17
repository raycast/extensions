import { Action, ActionPanel, Application, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import * as os from "os";
import { HistoryService } from "./history";
import { PinnedProjectsService } from "./pinned";
import { DirectoryInfo, DirectoryMap, ExtPreferences, ProjectItemProperties, SubSectionProperties } from "./types";
import { convertToFindFilter, extractDirectoryInfo, nullSafeUseCachedPromise, parseDirectoryOutput } from "./utils";

export default function Command() {
  const preferences = getPreferenceValues<ExtPreferences>();
  const history = nullSafeUseCachedPromise(HistoryService.getHistory);
  const pinnedProjects = nullSafeUseCachedPromise(PinnedProjectsService.getPinned);

  const includeFilters = preferences.projectContainsFilter;
  const pruneDirectories = "'*/node_modules'";
  const directoriesToSearch = preferences.projectsDirectory.replace(";", "\\ ");
  const { data: directories, isLoading } = useExec(
    "find",
    [
      directoriesToSearch,
      "-maxdepth",
      String(preferences.searchDepth),
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
        return parseDirectoryOutput(args.stdout);
      },
    }
  );

  // Only validate if we're not loading and have completed the search
  if (!isLoading && directories && Object.keys(directories).length === 0) {
    showToast({
      style: Toast.Style.Failure,
      title: "Couldn't find any directories to open",
      message: `Please check if the file filters are defined properly`,
    }).then((r) => r.show());
  }

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

function getProjectItem({ project, preferences, additionalActions, key = project.path }: ProjectItemProperties) {
  function openActionString(application: string) {
    return (
      <Action.Open
        target={project.path}
        title={"Open with " + application}
        application={application}
        onOpen={async () => await HistoryService.saveToHistory(preferences, project.path)}
      />
    );
  }

  function openAction(application: Application) {
    return (
      <Action.Open
        target={project.path}
        title={"Open with " + application.name}
        application={application}
        onOpen={async () => await HistoryService.saveToHistory(preferences, project.path)}
      />
    );
  }

  return (
    <List.Item
      key={key}
      icon="extension_icon.png"
      title={project.name}
      accessories={[{ text: project.path.replace(os.homedir(), "~"), icon: Icon.Folder }]}
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
            <Action.CopyToClipboard title="Copy Link" content={project.path} />
            <Action.ShowInFinder path={project.path} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
