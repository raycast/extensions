// :copyright: Copyright (c) 2023 ftrack
import "cross-fetch/polyfill";
import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { buildExpression } from "./util/buildExpression";
import { configuration, EntityListItem } from "./EntityListItem";
import { session } from "./util/session";
import { useState } from "react";
import { SearchableEntity } from "./types";

type SearchableEntityType = keyof typeof configuration;

const searchRegex = new RegExp("(?:context_id:([\\w-]+))?(.*)");
async function searchEntities(entityType: SearchableEntityType, searchText = "", contextId = "") {
  console.debug(`Searching ${entityType}: ${searchText}`);
  const expression = buildExpression({
    entityType,
    projection: configuration[entityType].projection,
    order: configuration[entityType].order,
    filter: "",
    limit: 100,
    offset: 0,
  });

  const matches = searchText.match(searchRegex);
  const searchContextId = matches?.[1] || contextId;
  const terms = (matches?.[2] ?? "").split(" ") ?? [];
  console.debug(`contextId=${searchContextId}, terms=${terms}`);

  const response = await session.search(
    {
      expression,
      entityType,
      terms,
      contextId: searchContextId,
    },
    { decodeDatesAsIso: true }
  );

  console.debug(`Found ${response.data.length} items`);
  return response.data as SearchableEntity[];
}

function EntityTypeDropdown(props: { value: SearchableEntityType; onChange: (newValue: string) => void }) {
  const options = Object.entries(configuration).map(([key, value]) => ({
    id: key,
    name: value.namePlural.charAt(0).toUpperCase() + value.namePlural.slice(1),
  }));
  const { onChange } = props;
  return (
    <List.Dropdown tooltip="Select type" value={props.value} onChange={onChange}>
      {options.map((item) => (
        <List.Dropdown.Item key={item.id} title={item.name} value={item.id} />
      ))}
    </List.Dropdown>
  );
}

function SearchEntitiesList({
  entityType = "Project",
  onEntityTypeChange,
  defaultSearchText = "",
  contextId = "",
  placeholder,
}: {
  entityType?: SearchableEntityType;
  onEntityTypeChange: (entityType: SearchableEntityType) => void;
  defaultSearchText?: string;
  contextId?: string;
  placeholder?: string;
}) {
  const [searchText, setSearchText] = useState(defaultSearchText);
  const { data, isLoading, revalidate } = usePromise(searchEntities, [entityType, searchText, contextId]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      isLoading={isLoading}
      navigationTitle={placeholder}
      searchBarPlaceholder={placeholder}
      searchBarAccessory={
        <EntityTypeDropdown
          value={entityType}
          onChange={(value) => {
            onEntityTypeChange(value as SearchableEntityType);
          }}
        />
      }
    >
      {data?.map((entity) => {
        const entityConfig = configuration[entityType];
        return <EntityListItem key={entity.id} configuration={entityConfig} entity={entity} revalidate={revalidate} />;
      })}
      {data?.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={`No ${configuration[entityType].namePlural} found`} />
      ) : null}
    </List>
  );
}

export default function SearchEntitiesCommand({
  entityType = "Project",
  ...props
}: {
  entityType?: SearchableEntityType;
  placeholder?: string;
  contextId?: string;
}) {
  const [selectedEntityType, setEntityType] = useState<SearchableEntityType>(entityType);

  return (
    <SearchEntitiesList
      key={selectedEntityType}
      entityType={selectedEntityType}
      onEntityTypeChange={setEntityType}
      {...props}
    />
  );
}
