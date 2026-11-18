import { Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { EmptyViewObject, ObjectListItem, ViewType } from "..";
import { useObjectsInList } from "../../hooks";
import { useListViews } from "../../hooks/useListViews";
import { ObjectLayout, Space, ViewLayout } from "../../models";
import { isEmoji, objectMatchesSearch, pluralize, processObject } from "../../utils";
import { defaultTintColor } from "../../utils/constant";

type CollectionListProps = {
  space: Space;
  listId: string;
  listName: string;
  listLayout?: ObjectLayout;
};

export function CollectionList({ space, listId, listName, listLayout }: CollectionListProps) {
  const [searchText, setSearchText] = useState("");
  const { views, viewsError, isLoadingViews, mutateViews } = useListViews(space.id, listId);
  const [viewId, setViewId] = useState(views?.[0]?.id);
  const { objects, objectsError, isLoadingObjects, mutateObjects, objectsPagination } = useObjectsInList(
    space.id,
    listId,
    viewId,
    searchText,
  );

  useEffect(() => {
    if (viewsError || objectsError) {
      showFailureToast(viewsError || objectsError, { title: "Failed to fetch latest data" });
    }
  }, [viewsError, objectsError]);

  const filteredObjects = objects
    .filter((object) => objectMatchesSearch(object, searchText))
    .map((object) => {
      return processObject(object, false, mutateObjects);
    });

  const resolveLayoutIcon = (layout: ViewLayout) => {
    switch (layout) {
      case ViewLayout.Grid:
        return { source: "icons/dataview/grid.svg" };
      case ViewLayout.List:
        return { source: "icons/dataview/list.svg" };
      case ViewLayout.Gallery:
        return { source: "icons/dataview/gallery.svg" };
      case ViewLayout.Kanban:
        return { source: "icons/dataview/kanban.svg" };
      case ViewLayout.Calendar:
        return { source: "icons/dataview/calendar.svg" };
      case ViewLayout.Graph:
        return { source: "icons/dataview/graph.svg" };
      default:
        return { source: Icon.AppWindowGrid3x3, tintColor: defaultTintColor };
    }
  };

  return (
    <List
      isLoading={isLoadingViews || isLoadingObjects}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={"Search objects in list..."}
      navigationTitle={`Browse ${listName}`}
      pagination={objectsPagination}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Change view" onChange={(newValue) => setViewId(newValue)}>
          {views.map((view) => (
            <List.Dropdown.Item
              key={view.id}
              value={view.id}
              title={view.name}
              icon={!isEmoji(view.name.split(" ")[0]) ? resolveLayoutIcon(view.layout) : undefined}
            />
          ))}
        </List.Dropdown>
      }
    >
      {filteredObjects && filteredObjects.length > 0 ? (
        <List.Section
          title={searchText ? "Search Results" : "Objects"}
          subtitle={pluralize(filteredObjects.length, "object", { withNumber: true })}
        >
          {filteredObjects.map((object) => (
            <ObjectListItem
              key={object.id}
              space={space}
              objectId={object.id}
              icon={object.icon}
              title={object.title}
              subtitle={object.subtitle}
              accessories={object.accessories}
              mutate={object.mutate}
              object={object.object}
              mutateViews={mutateViews}
              layout={object.layout}
              viewType={ViewType.objects}
              isGlobalSearch={false}
              isNoPinView={true}
              isPinned={object.isPinned}
              searchText={searchText}
              listId={listId}
              listName={listName}
              listLayout={listLayout}
            />
          ))}
        </List.Section>
      ) : (
        <EmptyViewObject
          title="No objects found"
          contextValues={{
            spaceId: space.id,
            listId: listId,
            name: searchText,
          }}
        />
      )}
    </List>
  );
}
