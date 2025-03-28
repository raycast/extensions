import { Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { EmptyViewObject, EnsureAuthenticated, ObjectListItem, ViewType } from "./components";
import { useGlobalSearch, usePinnedObjects, useSpaces } from "./hooks";
import { SpaceObject } from "./models";
import {
  defaultTintColor,
  fetchTypeKeysForLists,
  fetchTypeKeysForPages,
  fetchTypesKeysForTasks,
  getSectionTitle,
  localStorageKeys,
  pluralize,
  processObject,
} from "./utils";

const searchBarPlaceholder = "Globally search objects across spaces...";

export default function Command() {
  return (
    <EnsureAuthenticated placeholder={searchBarPlaceholder} viewType="list">
      <Search />
    </EnsureAuthenticated>
  );
}

function Search() {
  const [searchText, setSearchText] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [spaceIcons, setSpaceIcons] = useState<Map<string, Image.ImageLike>>(new Map());
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.objects);
  const [typeKeysForPages, setTypeKeysForPages] = useState<string[]>([]);
  const [typeKeysForTasks, setTypeKeysForTasks] = useState<string[]>([]);
  const [typeKeysForLists, setTypeKeysForLists] = useState<string[]>([]);

  const { objects, objectsError, isLoadingObjects, mutateObjects, objectsPagination } = useGlobalSearch(
    searchText,
    types,
  );
  const { spaces, spacesError, isLoadingSpaces } = useSpaces();
  const { pinnedObjects, pinnedObjectsError, isLoadingPinnedObjects, mutatePinnedObjects } = usePinnedObjects(
    localStorageKeys.suffixForGlobalSearch,
  );

  useEffect(() => {
    if (spaces) {
      const spaceIconMap = new Map(spaces.map((space) => [space.id, space.icon]));
      setSpaceIcons(spaceIconMap);
    }
  }, [spaces]);

  // Fetch unique keys for pages view
  useEffect(() => {
    const fetchTypesForPages = async () => {
      if (spaces) {
        const pagesTypes = await fetchTypeKeysForPages(spaces, typeKeysForTasks, typeKeysForLists);
        setTypeKeysForPages(pagesTypes);
      }
    };
    fetchTypesForPages();
  }, [spaces, typeKeysForTasks, typeKeysForLists]);

  // Fetch unique keys for tasks view
  useEffect(() => {
    const fetchTypesForTasks = async () => {
      if (spaces) {
        const tasksTypes = await fetchTypesKeysForTasks(spaces);
        setTypeKeysForTasks(tasksTypes);
      }
    };
    fetchTypesForTasks();
  }, [spaces]);

  // Fetch unique keys for lists view
  useEffect(() => {
    const fetchTypesForLists = async () => {
      if (spaces) {
        const listTypes = await fetchTypeKeysForLists(spaces);
        setTypeKeysForLists(listTypes);
      }
    };
    fetchTypesForLists();
  }, [spaces]);

  // Set object types based on the selected filter
  useEffect(() => {
    const viewToType: Partial<Record<ViewType, string[]>> = {
      [ViewType.objects]: [],
      [ViewType.pages]: typeKeysForPages,
      [ViewType.tasks]: typeKeysForTasks,
      [ViewType.lists]: typeKeysForLists,
      [ViewType.bookmarks]: ["ot-bookmark"],
    };
    setTypes(viewToType[currentView] ?? []);
  }, [currentView, typeKeysForPages, typeKeysForTasks]);

  useEffect(() => {
    if (objectsError || spacesError || pinnedObjectsError) {
      showToast(
        Toast.Style.Failure,
        "Failed to fetch latest data",
        objectsError?.message || spacesError?.message || pinnedObjectsError?.message,
      );
    }
  }, [objectsError, spacesError, pinnedObjectsError]);

  const spaceById = useMemo(() => {
    if (!spaces) return new Map<string, (typeof spaces)[number]>();
    return new Map(spaces.map((space) => [space.id, space]));
  }, [spaces]);

  const processObjectWithSpaceIcon = (object: SpaceObject, isPinned: boolean) => {
    const spaceIcon = spaceIcons.get(object.space_id) || Icon.BullsEye;
    const processedObject = processObject(object, isPinned, mutateObjects, mutatePinnedObjects);

    return {
      ...processedObject,
      accessories: [
        ...processedObject.accessories,
        {
          icon: spaceIcon,
          tooltip: `Space: ${spaces?.find((space) => space.id === object.space_id)?.name}`,
        },
      ],
    };
  };

  // Helper to filter objects by the search term
  const filterObjectsBySearchTerm = (objects: SpaceObject[], searchTerm: string) => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return objects.filter(
      (object) =>
        object.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        object.snippet.toLowerCase().includes(lowerCaseSearchTerm),
    );
  };

  // Process pinned objects and filter by search term
  const processedPinnedObjects = pinnedObjects?.length
    ? pinnedObjects
        // TODO: decide on wanted behavior for pinned objects
        .filter((object) => types.length === 0 || types.includes(object.type.key))
        .filter((object) => filterObjectsBySearchTerm([object], searchText).length > 0)
        .map((object) => processObjectWithSpaceIcon(object, true))
    : [];

  // Process non-pinned objects
  const processedRegularObjects = objects
    .filter(
      (object) => !pinnedObjects?.some((pinned) => pinned.id === object.id && pinned.space_id === object.space_id),
    )
    .map((object) => processObjectWithSpaceIcon(object, false));

  const subtitle = pluralize(processedRegularObjects.length, currentView, {
    withNumber: true,
  });

  return (
    <List
      isLoading={isLoadingSpaces || isLoadingPinnedObjects || isLoadingObjects}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={searchBarPlaceholder}
      pagination={objectsPagination}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by kind"
          onChange={(value) => setCurrentView(value as ViewType)}
          value={currentView}
        >
          <List.Dropdown.Item
            title="All"
            value={ViewType.objects}
            icon={{ source: "icons/type/search.svg", tintColor: defaultTintColor }}
          />
          <List.Dropdown.Section>
            <List.Dropdown.Item
              title="Pages"
              value={ViewType.pages}
              icon={{ source: "icons/type/document.svg", tintColor: defaultTintColor }}
            />
            <List.Dropdown.Item
              title="Tasks"
              value={ViewType.tasks}
              icon={{ source: "icons/type/checkbox.svg", tintColor: defaultTintColor }}
            />
            <List.Dropdown.Item
              title="Lists"
              value={ViewType.lists}
              icon={{ source: "icons/type/layers.svg", tintColor: defaultTintColor }}
            />
            <List.Dropdown.Item
              title="Bookmarks"
              value={ViewType.bookmarks}
              icon={{ source: "icons/type/bookmark.svg", tintColor: defaultTintColor }}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {processedPinnedObjects.length > 0 && (
        <List.Section title="Pinned" subtitle={subtitle}>
          {processedPinnedObjects.map((object, index) => (
            <ObjectListItem
              key={`${object.id}-${index}`}
              space={spaceById.get(object.spaceId)!}
              objectId={object.id}
              icon={object.icon}
              title={object.title}
              subtitle={object.subtitle}
              accessories={object.accessories}
              mutate={[mutateObjects, mutatePinnedObjects]}
              layout={object.layout}
              viewType={currentView}
              isGlobalSearch={true}
              isNoPinView={false}
              isPinned={object.isPinned}
            />
          ))}
        </List.Section>
      )}
      {processedRegularObjects.length > 0 ? (
        <List.Section title={getSectionTitle(searchText)} subtitle={subtitle}>
          {processedRegularObjects.map((object, index) => (
            <ObjectListItem
              key={`${object.id}-${index}`}
              space={spaceById.get(object.spaceId)!}
              objectId={object.id}
              icon={object.icon}
              title={object.title}
              subtitle={object.subtitle}
              accessories={object.accessories}
              mutate={[mutateObjects, mutatePinnedObjects]}
              layout={object.layout}
              viewType={currentView}
              isGlobalSearch={true}
              isNoPinView={false}
              isPinned={object.isPinned}
            />
          ))}
        </List.Section>
      ) : (
        <EmptyViewObject
          title="No objects found"
          contextValues={{
            name: searchText,
          }}
        />
      )}
    </List>
  );
}
