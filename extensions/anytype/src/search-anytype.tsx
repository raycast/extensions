import { Icon, List, showToast, Toast, Image, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useSpaces } from "./hooks/useSpaces";
import { useGlobalSearch } from "./hooks/useGlobalSearch";
import { getAllTypesFromSpaces } from "./helpers/types";
import ObjectListItem from "./components/ObjectListItem";
import EmptyView from "./components/EmptyView";
import EnsureAuthenticated from "./components/EnsureAuthenticated";
import { getDateLabel, pluralize } from "./helpers/strings";

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
  const [spaceIcons, setSpaceIcons] = useState<{ [key: string]: string }>({});
  const [filterType, setFilterType] = useState("all");
  const [uniqueKeysForPages, setUniqueKeysForPages] = useState<string[]>([]);
  const [uniqueKeysForTasks, setUniqueKeysForTasks] = useState<string[]>([]);

  const { objects, objectsError, isLoadingObjects, mutateObjects, objectsPagination } = useGlobalSearch(
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

  const processedObjects = objects.map((object) => {
    const spaceIcon = spaceIcons[object.space_id];
    const dateToSortAfter = getPreferenceValues().sort;
    const date = object.details.find((detail) => detail.id === dateToSortAfter)?.details[dateToSortAfter] as string;

    return {
      key: object.id,
      spaceId: object.space_id,
      objectId: object.id,
      icon: {
        source: object.icon,
        mask:
          (object.layout === "participant" || object.layout === "profile") && object.icon != Icon.Document
            ? Image.Mask.Circle
            : Image.Mask.RoundedRectangle,
      },
      title: object.name,
      subtitle: {
        value: object.type,
        tooltip: `Type: ${object.type}`,
      },
      accessories: [
        ...(date
          ? [
              {
                date: new Date(date),
                tooltip: `${getDateLabel()}: ${format(new Date(date), "EEEE d MMMM yyyy 'at' HH:mm")}`,
              },
            ]
          : []),
        ...(spaceIcon
          ? [
              {
                icon: {
                  source: spaceIcon,
                  mask: Image.Mask.RoundedRectangle,
                },
                tooltip: `Space: ${spaces?.find((space) => space.id === object.space_id)?.name}`,
              },
            ]
          : []),
      ],
    };
  });

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
      {processedObjects.length > 0 ? (
        <List.Section
          title={searchText ? "Search Results" : "Modified Recently"}
          subtitle={`${pluralize(processedObjects.length, viewType, { withNumber: true })}`}
        >
          {processedObjects.map((object) => (
            <ObjectListItem
              key={object.key}
              spaceId={object.spaceId}
              objectId={object.objectId}
              icon={object.icon}
              title={object.title}
              subtitle={object.subtitle}
              accessories={object.accessories}
              mutate={mutateObjects}
              viewType={filterType}
            />
          ))}
        </List.Section>
      ) : (
        <EmptyView title="No Objects Found" />
      )}
    </List>
  );
}
