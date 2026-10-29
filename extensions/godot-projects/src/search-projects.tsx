import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ProjectItem } from "./components/project-item";
import { openProjectManager } from "./lib/launch";
import { loadProjects } from "./lib/load-projects";
import { getProjectListPath } from "./lib/platform";
import { groupProjects } from "./lib/projects";

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(loadProjects, [getProjectListPath()], {
    onError: async (error) => {
      await showFailureToast(error, { title: "Could not load Godot projects" });
    },
  });

  const { favorites, others } = groupProjects(data?.projects ?? []);
  const isEmpty = favorites.length === 0 && others.length === 0;

  const emptyActions = (
    <ActionPanel>
      <Action title="Open Project Manager" icon={Icon.AppWindowList} onAction={openProjectManager} />
      <Action
        title="Reload Projects"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Godot projects">
      {!isLoading && isEmpty && error && (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Load Projects"
          description={error.message}
          actions={emptyActions}
        />
      )}
      {!isLoading && isEmpty && !error && (
        <List.EmptyView
          icon="extension-icon.png"
          title="No Godot Projects"
          description={
            data?.listFound === false
              ? "Godot has no project list yet. Open the Project Manager and create or import a project."
              : "Create or import a project in the Godot Project Manager, and it shows up here."
          }
          actions={emptyActions}
        />
      )}
      <List.Section title="Favorites" subtitle={favorites.length > 0 ? String(favorites.length) : undefined}>
        {favorites.map((project) => (
          <ProjectItem key={project.path} project={project} onReload={revalidate} />
        ))}
      </List.Section>
      <List.Section title="Projects" subtitle={others.length > 0 ? String(others.length) : undefined}>
        {others.map((project) => (
          <ProjectItem key={project.path} project={project} onReload={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}
