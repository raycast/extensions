import { useCallback } from "react";
import { Color, getPreferenceValues, Keyboard } from "@raycast/api";
import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";

import { getProjects } from "./lib/get-projects";
import { getProjectAccessories } from "./lib/ui/get-project-accessories";
import { archiveProject } from "./lib/archive-project";
import type { Project } from "./types/project";
import { unarchiveProject } from "./lib/unarchive-project";

export default function Command() {
  const { directory, openWith, excludePatterns } = getPreferenceValues<Preferences.SearchProjects>();
  const { data, isLoading, revalidate } = useCachedPromise(getProjects, [directory, excludePatterns.split(",")], {
    // keepPreviousData: true,
  });

  const onUnarchiveProject = useCallback(
    async (project: Project) => {
      try {
        showToast({
          style: Toast.Style.Animated,
          title: "Unarchiving project...",
        });

        await unarchiveProject(project.pathname);

        revalidate();

        showToast({
          title: "Project unarchived",
          message: `Project ${project.filename} has been unarchived`,
        });
      } catch (err) {
        showFailureToast(err);
      }
    },
    [revalidate],
  );

  const onArchiveProject = useCallback(
    async (project: Project) => {
      try {
        showToast({
          style: Toast.Style.Animated,
          title: "Archiving project...",
        });

        const archivePath = await archiveProject(project.pathname, excludePatterns.split(","));

        revalidate();

        showToast({
          title: "Project archived",
          message: `Project ${project.filename} has been archived to ${archivePath}`,
        });
      } catch (err) {
        showFailureToast(err);
      }
    },
    [revalidate, excludePatterns],
  );

  return (
    <List isLoading={isLoading}>
      {data?.map((item) => (
        <List.Item
          key={item.id}
          title={item.filename}
          subtitle={item.archived ? "Archived" : undefined}
          accessories={getProjectAccessories(item)}
          actions={
            <ActionPanel>
              {item.archived ? (
                <Action title="Unarchive Project" onAction={onUnarchiveProject.bind(null, item)} icon={Icon.Folder} />
              ) : (
                <>
                  <Action.Open
                    title="Open Project"
                    target={item.pathname}
                    application={openWith}
                    icon={Icon.Folder}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                  <Action.OpenWith
                    title="Open With"
                    path={item.pathname}
                    shortcut={Keyboard.Shortcut.Common.OpenWith}
                  />
                  <Action
                    title="Archive Project"
                    onAction={onArchiveProject.bind(null, item)}
                    icon={Icon.Folder}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                </>
              )}
            </ActionPanel>
          }
          icon={{
            source: item.archived ? "folder-archive.svg" : "folder.svg",
            tintColor: item.archived ? Color.SecondaryText : Color.PrimaryText,
          }}
        />
      ))}
    </List>
  );
}
