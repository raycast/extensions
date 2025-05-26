import { Icon, List } from "@raycast/api";
import { MutatePromise, showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { EmptyViewObject, EmptyViewProperty, EmptyViewType, ObjectListItem } from ".";
import {
  useMembers,
  usePinnedMembers,
  usePinnedObjects,
  usePinnedProperties,
  usePinnedTypes,
  useProperties,
  useSearch,
  useTypes,
} from "../hooks";
import { Member, MemberStatus, Property, Space, SpaceObject, Type } from "../models";
import {
  defaultTintColor,
  formatMemberRole,
  isUserProperty,
  isUserType,
  localStorageKeys,
  pluralize,
  processObject,
} from "../utils";

type ObjectListProps = {
  space: Space;
};

export enum ViewType {
  // browse
  objects = "Object", // is "all" view in global search
  types = "Type",
  properties = "Property",
  tags = "Tag",
  members = "Member",
  templates = "Template",

  // search
  pages = "Page",
  tasks = "Task",
  lists = "List",
  bookmarks = "Bookmark",
}

export function ObjectList({ space }: ObjectListProps) {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.objects);
  const [searchText, setSearchText] = useState("");

  const { objects, objectsError, isLoadingObjects, mutateObjects, objectsPagination } = useSearch(
    space.id,
    searchText,
    [],
  );
  const { types, typesError, isLoadingTypes, mutateTypes, typesPagination } = useTypes(space.id);
  const { properties, propertiesError, isLoadingProperties, mutateProperties, propertiesPagination } = useProperties(
    space.id,
  );
  const { members, membersError, isLoadingMembers, mutateMembers, membersPagination } = useMembers(space.id);
  const { pinnedObjects, pinnedObjectsError, isLoadingPinnedObjects, mutatePinnedObjects } = usePinnedObjects(
    localStorageKeys.suffixForViewsPerSpace(space.id, ViewType.objects),
  );
  const { pinnedTypes, pinnedTypesError, isLoadingPinnedTypes, mutatePinnedTypes } = usePinnedTypes(
    localStorageKeys.suffixForViewsPerSpace(space.id, ViewType.types),
  );
  const { pinnedProperties, pinnedPropertiesError, isLoadingPinnedProperties, mutatePinnedProperties } =
    usePinnedProperties(localStorageKeys.suffixForViewsPerSpace(space.id, ViewType.properties));
  const { pinnedMembers, pinnedMembersError, isLoadingPinnedMembers, mutatePinnedMembers } = usePinnedMembers(
    localStorageKeys.suffixForViewsPerSpace(space.id, ViewType.members),
  );
  const [pagination, setPagination] = useState(objectsPagination);

  useEffect(() => {
    const paginationMap: Partial<Record<ViewType, typeof objectsPagination>> = {
      [ViewType.objects]: objectsPagination,
      [ViewType.types]: typesPagination,
      [ViewType.properties]: propertiesPagination,
      [ViewType.members]: membersPagination,
    };
    setPagination(paginationMap[currentView]);
  }, [currentView, objects, types, properties, members]);

  useEffect(() => {
    if (objectsError || typesError || propertiesError || membersError) {
      showFailureToast(objectsError || typesError || propertiesError || membersError, {
        title: "Failed to fetch latest data",
      });
    }
  }, [objectsError, typesError, propertiesError, membersError]);

  useEffect(() => {
    if (pinnedObjectsError || pinnedTypesError || pinnedPropertiesError || pinnedMembersError) {
      showFailureToast(pinnedObjectsError || pinnedTypesError || pinnedPropertiesError || pinnedMembersError, {
        title: "Failed to fetch pinned data",
      });
    }
  }, [pinnedObjectsError, pinnedTypesError, pinnedPropertiesError, pinnedMembersError]);

  const filterItems = <T extends { name: string }>(items: T[], searchText: string): T[] => {
    return items?.filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase()));
  };

  const processType = (type: Type, isPinned: boolean) => {
    return {
      spaceId: space.id,
      id: type.id,
      icon: type.icon,
      title: type.name,
      subtitle: { value: "", tooltip: "" },
      accessories: [
        ...(isPinned ? [{ icon: Icon.Star, tooltip: "Pinned" }] : []),
        ...(!isUserType(type.key) ? [{ icon: Icon.Lock, tooltip: "System" }] : []),
      ],
      mutate: [mutateTypes, mutatePinnedTypes as MutatePromise<SpaceObject[] | Type[] | Property[] | Member[]>],
      object: type,
      layout: type.layout,
      isPinned,
    };
  };

  const processProperty = (property: Property, isPinned: boolean) => {
    return {
      spaceId: space.id,
      id: property.id,
      icon: property.icon,
      title: property.name,
      subtitle: { value: "", tooltip: "" },
      accessories: [
        ...(isPinned ? [{ icon: Icon.Star, tooltip: "Pinned" }] : []),
        ...(!isUserProperty(property.key) ? [{ icon: Icon.Lock, tooltip: "System" }] : []),
      ],
      mutate: [
        mutateProperties,
        mutatePinnedProperties as MutatePromise<SpaceObject[] | Type[] | Property[] | Member[]>,
      ],
      object: property,
      layout: undefined,
      isPinned,
    };
  };

  const processMember = (member: Member, isPinned: boolean) => {
    return {
      spaceId: space.id,
      id: member.id,
      icon: member.icon,
      title: member.name,
      subtitle: { value: member.global_name, tooltip: `ANY Name: ${member.global_name}` },
      accessories: [
        ...(isPinned ? [{ icon: Icon.Star, tooltip: "Pinned" }] : []),
        member.status === MemberStatus.Joining
          ? {
              tag: { value: "Join Request", color: "orange", tooltip: "Pending" },
            }
          : {
              text: formatMemberRole(member.role),
              tooltip: `Role: ${formatMemberRole(member.role)}`,
            },
      ],
      mutate: [mutateMembers, mutatePinnedMembers as MutatePromise<SpaceObject[] | Type[] | Property[] | Member[]>],
      object: member,
      layout: undefined,
      isPinned,
    };
  };

  const getCurrentItems = () => {
    switch (currentView) {
      case ViewType.objects: {
        const processedPinned = pinnedObjects?.length
          ? pinnedObjects
              .filter((object) => filterItems([object], searchText).length > 0)
              .map((object) => processObject(object, true, mutateObjects, mutatePinnedObjects))
          : [];

        const processedRegular = objects
          .filter(
            (object) =>
              !pinnedObjects?.some((pinned) => pinned.id === object.id && pinned.space_id === object.space_id),
          )
          .map((object) => processObject(object, false, mutateObjects, mutatePinnedObjects));

        return { processedPinned, processedRegular };
      }

      case ViewType.types: {
        const processedPinned = pinnedTypes?.length
          ? pinnedTypes
              .filter((type) => filterItems([type], searchText).length > 0)
              .map((type) => processType(type, true))
          : [];

        const processedRegular = types
          .filter((type) => !pinnedTypes?.some((pinned) => pinned.id === type.id))
          .filter((type) => filterItems([type], searchText).length > 0)
          .map((type) => processType(type, false));

        return { processedPinned, processedRegular };
      }

      case ViewType.properties: {
        const processedPinned = pinnedProperties?.length
          ? pinnedProperties
              .filter((property) => filterItems([property], searchText).length > 0)
              .map((property) => processProperty(property, true))
          : [];
        const processedRegular = properties
          .filter((property) => !pinnedProperties?.some((pinned) => pinned.id === property.id))
          .filter((property) => filterItems([property], searchText).length > 0)
          .map((property) => processProperty(property, false));

        return { processedPinned, processedRegular };
      }

      case ViewType.members: {
        const processedPinned = pinnedMembers?.length
          ? pinnedMembers
              .filter((member) => filterItems([member], searchText).length > 0)
              .map((member) => processMember(member, true))
          : [];

        const processedRegular = members
          .filter((member) => !pinnedMembers?.some((pinned) => pinned.id === member.id))
          .filter((member) => filterItems([member], searchText).length > 0)
          .map((member) => processMember(member, false));

        return { processedPinned, processedRegular };
      }

      default:
        return {
          processedPinned: [],
          processedRegular: [],
        };
    }
  };

  const { processedPinned, processedRegular } = getCurrentItems();
  const isLoading =
    isLoadingObjects ||
    isLoadingTypes ||
    isLoadingProperties ||
    isLoadingMembers ||
    isLoadingPinnedObjects ||
    isLoadingPinnedTypes ||
    isLoadingPinnedProperties ||
    isLoadingPinnedMembers;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search ${pluralize(2, currentView.charAt(0).toLowerCase() + currentView.slice(1))}...`}
      navigationTitle={`Browse ${space.name}`}
      pagination={pagination}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Choose View"
          onChange={(value) => setCurrentView(value as ViewType)}
          value={currentView}
        >
          <List.Dropdown.Item
            title="Objects"
            value={ViewType.objects}
            icon={{ source: "icons/type/document.svg", tintColor: defaultTintColor }}
          />
          <List.Dropdown.Item
            title="Types"
            value={ViewType.types}
            icon={{ source: "icons/type/extension-puzzle.svg", tintColor: defaultTintColor }}
          />
          <List.Dropdown.Item
            title="Properties"
            value={ViewType.properties}
            icon={{ source: "icons/type/pricetags.svg", tintColor: defaultTintColor }}
          />
          <List.Dropdown.Item
            title="Members"
            value={ViewType.members}
            icon={{ source: "icons/type/people.svg", tintColor: defaultTintColor }}
          />
        </List.Dropdown>
      }
    >
      {processedPinned && processedPinned.length > 0 && (
        <List.Section
          title="Pinned"
          subtitle={`${pluralize(processedPinned.length, currentView, { withNumber: true })}`}
        >
          {processedPinned.map((item) => (
            <ObjectListItem
              key={item.id}
              space={space}
              objectId={item.id}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              accessories={item.accessories}
              mutate={item.mutate}
              object={item.object}
              layout={item.layout}
              viewType={currentView}
              isGlobalSearch={false}
              isNoPinView={false}
              isPinned={item.isPinned}
              searchText={searchText}
            />
          ))}
        </List.Section>
      )}
      {processedRegular && processedRegular.length > 0 ? (
        <List.Section
          title={searchText ? "Search Results" : `All ${pluralize(2, currentView)}`}
          subtitle={`${pluralize(processedRegular.length, currentView, { withNumber: true })}`}
        >
          {processedRegular.map((item) => (
            <ObjectListItem
              key={item.id}
              space={space}
              objectId={item.id}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              accessories={item.accessories}
              mutate={item.mutate}
              object={item.object}
              layout={item.layout}
              viewType={currentView}
              isGlobalSearch={false}
              isNoPinView={false}
              isPinned={item.isPinned}
              searchText={searchText}
            />
          ))}
        </List.Section>
      ) : (
        (() => {
          switch (currentView) {
            case ViewType.types:
              return (
                <EmptyViewType
                  title={`No ${currentView.charAt(0).toUpperCase() + currentView.slice(1)} Found`}
                  contextValues={{
                    spaceId: space.id,
                    name: searchText,
                  }}
                />
              );
            case ViewType.properties:
              return (
                <EmptyViewProperty
                  title={`No ${currentView.charAt(0).toUpperCase() + currentView.slice(1)} Found`}
                  spaceId={space.id}
                  contextValues={{
                    name: searchText,
                  }}
                />
              );
            default:
              return (
                <EmptyViewObject
                  title={`No ${currentView.charAt(0).toUpperCase() + currentView.slice(1)} Found`}
                  contextValues={{
                    spaceId: space.id,
                    name: searchText,
                  }}
                />
              );
          }
        })()
      )}
    </List>
  );
}
