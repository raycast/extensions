// src/projects.tsx
import { List } from "@raycast/api";
import {
  useProjects,
  GlobalIdeWarning,
  SearchSuggestionsList,
  ProjectListItem,
  GroupingMode,
} from "./projects/index";

export default function Command() {
  const {
    isLoading,
    searchText,
    setSearchText,
    grouping,
    setGrouping,
    isGlobalIdeValid,
    preferences,
    groupedProjects,
    searchSuggestions,
    collectionMap,
    handleOpen,
    handleDelete,
    handleDeleteFromExtension,
    applySuggestion,
    loadProjects,
  } = useProjects();

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      searchBarPlaceholder="Search projects... (#collection, lang:, org:)"
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Grouping"
          value={grouping}
          onChange={(value) => setGrouping(value as GroupingMode)}
        >
          <List.Dropdown.Item title="By Collection" value="collection" />
          <List.Dropdown.Item title="By Recency" value="recency" />
          <List.Dropdown.Item title="Flat List" value="flat" />
        </List.Dropdown>
      }
    >
      {searchSuggestions.length > 0 && (
        <SearchSuggestionsList
          suggestions={searchSuggestions}
          onApply={applySuggestion}
        />
      )}
      {!isGlobalIdeValid && preferences.ide && (
        <GlobalIdeWarning ideName={preferences.ide.name} />
      )}
      {groupedProjects.length === 0 &&
      searchSuggestions.length === 0 &&
      !isLoading ? (
        <List.EmptyView
          title="No projects found"
          description="No projects match your search"
        />
      ) : (
        groupedProjects.map((group) => (
          <List.Section
            key={group.title}
            title={`${group.title} · ${group.projects.length}`}
          >
            {group.projects.map((project) => (
              <ProjectListItem
                key={project.path}
                project={project}
                isAutoGroup={group.isAuto}
                collectionMap={collectionMap}
                preferences={preferences}
                onOpen={handleOpen}
                onDelete={handleDelete}
                onDeleteFromExtension={handleDeleteFromExtension}
                onReload={loadProjects}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
