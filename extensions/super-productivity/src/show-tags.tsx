import { Icon } from "@raycast/api";
import { BrowseEntitiesCommand } from "./components/BrowseEntitiesCommand";
import { TaskListView } from "./components/TaskListView";
import { listTags } from "./lib/sp-client";
import { SpTag } from "./lib/sp-models";

export default function Command() {
  return (
    <BrowseEntitiesCommand<SpTag>
      title="Show Tags"
      searchBarPlaceholder="Filter tags by title"
      loadItems={() => listTags()}
      emptyTitle="No Tags Found"
      emptyDescription="No tags are available in Super Productivity."
      getAccessories={(tag) =>
        tag.color
          ? [{ icon: { source: Icon.CircleFilled, tintColor: tag.color } }]
          : []
      }
      getDetailTarget={(tag) => (
        <TaskListView
          title={tag.title}
          navigationTitle={tag.title}
          tagId={tag.id}
        />
      )}
    />
  );
}
