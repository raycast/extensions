import { Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { EmptyViewObject, ObjectListItem, ViewType } from ".";
import { useObjectsInList } from "../hooks";
import { useListViews } from "../hooks/useListViews";
import { Space, ViewLayout } from "../models";
import { pluralize, processObject } from "../utils";
import { defaultTintColor } from "../utils/constant";

type CollectionListProps = {
  space: Space;
  listId: string;
  listName: string;
};

export function CollectionList({ space, listId, listName }: CollectionListProps) {
  const [searchText, setSearchText] = useState("");
  const { views, viewsError, isLoadingViews, mutateViews } = useListViews(space.id, listId);
  const [viewId, setViewId] = useState(views?.[0]?.id);
  const { objects, objectsError, isLoadingObjects, mutateObjects, objectsPagination } = useObjectsInList(
    space.id,
    listId,
    viewId,
  );

  useEffect(() => {
    if (viewsError || objectsError) {
      showToast(Toast.Style.Failure, "Failed to fetch objects", viewsError?.message || objectsError?.message);
    }
  }, [viewsError, objectsError]);

  const filteredObjects = objects
    ?.filter((object) => object.name.toLowerCase().includes(searchText.toLowerCase()))
    .map((object) => {
      return processObject(object, false, mutateObjects);
    });

  const resolveLayoutIcon = (layout: string) => {
    switch (layout.toLowerCase()) {
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
            <List.Dropdown.Item key={view.id} value={view.id} title={view.name} icon={resolveLayoutIcon(view.layout)} />
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
              mutateViews={mutateViews}
              layout={object.layout}
              viewType={ViewType.objects}
              isGlobalSearch={false}
              isNoPinView={true}
              isPinned={object.isPinned}
            />
          ))}
        </List.Section>
      ) : (
        <EmptyViewObject
          title="No objects found"
          contextValues={{
            space: space.id,
            list: listId,
            name: searchText,
          }}
        />
      )}
    </List>
  );
}
