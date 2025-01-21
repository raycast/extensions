import { Icon, List, showToast, Toast, Image } from "@raycast/api";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useSpaces } from "./hooks/useSpaces";
import { useSearch } from "./hooks/useSearch";
import { getAllTypesFromSpaces } from "./helpers/types";
import { SpaceObject } from "./helpers/schemas";
import ObjectListItem from "./components/ObjectListItem";
import EmptyView from "./components/EmptyView";
import EnsureAuthenticated from "./components/EnsureAuthenticated";
import { pluralize } from "./helpers/strings";

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
  const [objectTypes, setObjectTypes] = useState<string[]>([]);
  const [filteredItems, setFilteredItems] = useState<SpaceObject[]>([]);
  const [spaceIcons, setSpaceIcons] = useState<{ [key: string]: string }>({});
  const [filterType, setFilterType] = useState("all");
  const [uniqueKeysForPages, setUniqueKeysForPages] = useState<string[]>([]);
  const [uniqueKeysForTasks, setUniqueKeysForTasks] = useState<string[]>([]);

  const { objects, objectsError, isLoadingObjects, mutateObjects, objectsPagination } = useSearch(
    searchText,
    objectTypes,
  );
  const { spaces, spacesError, isLoadingSpaces } = useSpaces();
  const viewType = filterType === "all" ? "object" : filterType.replace(/s$/, "");
  const excludedKeysForPages = new Set([
    // not shown anywhere
    "ot-audio",
    "ot-chat",
    "ot-file",
    "ot-image",
    "ot-objectType",
    "ot-tag",
    "ot-template",
    "ot-video",

    // shown in other views
    "ot-set",
    "ot-collection",
    "ot-bookmark",
    "ot-participant",
    ...uniqueKeysForTasks,
  ]);

  useEffect(() => {
    if (spaces) {
      const spaceIconMap = spaces.reduce(
        (acc, space) => {
          acc[space.id] = space.icon;
          return acc;
        },
        {} as { [key: string]: string },
      );
      setSpaceIcons(spaceIconMap);
    }
  }, [spaces]);

  // Fetch unique keys for pages view
  useEffect(() => {
    const fetchTypesForPages = async () => {
      if (spaces) {
        const allTypes = await getAllTypesFromSpaces(spaces);
        const uniqueKeysSet = new Set(
          allTypes.map((type) => type.unique_key).filter((key) => !excludedKeysForPages.has(key)),
        );
        setUniqueKeysForPages(Array.from(uniqueKeysSet));
      }
    };

    fetchTypesForPages();
  }, [spaces]);

  // Fetch unique keys for tasks view
  useEffect(() => {
    const fetchTypesForTasks = async () => {
      if (spaces) {
        const tasksTypes = await getAllTypesFromSpaces(spaces);
        const uniqueKeysSet = new Set(
          tasksTypes.filter((type) => type.recommended_layout === "todo").map((type) => type.unique_key),
        );
        setUniqueKeysForTasks(Array.from(uniqueKeysSet));
      }
    };
    fetchTypesForTasks();
  }, [spaces]);

  useEffect(() => {
    if (objects) {
      const filteredObjects = objects.filter(
        (object) =>
          object.name.toLowerCase().includes(searchText.toLowerCase()) ||
          object.object_type.toLowerCase().includes(searchText.toLowerCase()),
      );
      setFilteredItems(filteredObjects);
    }
  }, [objects, searchText]);

  useEffect(() => {
    const objectTypeMap: { [key: string]: string[] } = {
      all: [],
      pages: uniqueKeysForPages,
      tasks: uniqueKeysForTasks,
      lists: ["ot-set", "ot-collection"],
      bookmarks: ["ot-bookmark"],
      members: ["ot-participant"],
    };

    setObjectTypes(objectTypeMap[filterType] || []);
  }, [filterType]);

  useEffect(() => {
    if (objectsError || spacesError) {
      showToast(Toast.Style.Failure, "Failed to fetch latest data", (objectsError || spacesError)?.message);
    }
  }, [objectsError, spacesError]);

  return (
    <List
      isLoading={isLoadingSpaces || isLoadingObjects}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={searchBarPlaceholder}
      pagination={objectsPagination}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by kind or space" onChange={(newValue) => setFilterType(newValue)}>
          <List.Dropdown.Item title="All" value="all" icon={Icon.MagnifyingGlass} />
          <List.Dropdown.Item title="Pages" value="pages" icon={Icon.Document} />
          <List.Dropdown.Item title="Tasks" value="tasks" icon={Icon.CheckCircle} />
          <List.Dropdown.Item title="Lists" value="lists" icon={Icon.List} />
          <List.Dropdown.Item title="Bookmarks" value="bookmarks" icon={Icon.Bookmark} />
          <List.Dropdown.Item title="Members" value="members" icon={Icon.PersonCircle} />
        </List.Dropdown>
      }
    >
      {filteredItems.length > 0 ? (
        <List.Section
          title={searchText ? "Search Results" : "Modified Recently"}
          subtitle={`${pluralize(filteredItems.length, viewType, { withNumber: true })}`}
        >
          {filteredItems.map((object) => (
            <ObjectListItem
              key={object.id}
              spaceId={object.space_id}
              objectId={object.id}
              icon={{
                source: object.icon,
                mask:
                  (object.layout === "participant" || object.layout === "profile") && object.icon != Icon.Document
                    ? Image.Mask.Circle
                    : Image.Mask.RoundedRectangle,
              }}
              title={object.name}
              subtitle={{
                value: object.object_type,
                tooltip: `Object Type: ${object.object_type}`,
              }}
              accessories={[
                {
                  date: new Date(object.details[0]?.details.last_modified_date as string),
                  tooltip: `Last Modified: ${format(new Date(object.details[0]?.details.last_modified_date as string), "EEEE d MMMM yyyy 'at' HH:mm")}`,
                },
                {
                  icon: {
                    source: spaceIcons[object.space_id],
                    mask: Image.Mask.RoundedRectangle,
                  },
                  tooltip: `Space: ${spaces?.find((space) => space.id === object.space_id)?.name}`,
                },
              ]}
              mutate={mutateObjects}
              viewType={viewType}
            />
          ))}
        </List.Section>
      ) : (
        <EmptyView title="No Objects Found" />
      )}
    </List>
  );
}
