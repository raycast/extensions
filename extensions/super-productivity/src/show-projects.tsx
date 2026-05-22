import { Icon } from "@raycast/api";
import { BrowseEntitiesCommand } from "./components/BrowseEntitiesCommand";
import { TaskListView } from "./components/TaskListView";
import { listProjects } from "./lib/sp-client";
import { SpProject } from "./lib/sp-models";

export default function Command() {
  return (
    <BrowseEntitiesCommand<SpProject>
      title="Show Projects"
      searchBarPlaceholder="Filter projects by title"
      loadItems={() => listProjects()}
      emptyTitle="No Projects Found"
      emptyDescription="No projects are available in Super Productivity."
      getAccessories={(project) =>
        project.color
          ? [{ icon: { source: Icon.CircleFilled, tintColor: project.color } }]
          : []
      }
      getDetailTarget={(project) => (
        <TaskListView
          title={project.title}
          navigationTitle={project.title}
          projectId={project.id}
        />
      )}
    />
  );
}
