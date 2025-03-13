import { List, Color, clearSearchBar } from "@raycast/api";
import { useEffect } from "react";
import { useMenuItemsLoader, useMenuItemFilters } from "./hooks";
import { ListItems, SectionDropdown, ErrorBoundary } from "./ui";

function MenuNavigator() {
  const {
    loading,
    app,
    data,
    loadingMessage,
    loadingState,
    loaded,
    refreshMenuItemsData,
  } = useMenuItemsLoader();

  const { options, filter, setFilter, filteredData } = useMenuItemFilters(data);
  const name = app?.name ? `${app.name} ` : "";

  useEffect(() => {
    clearSearchBar();
    setFilter("all-commands");
  }, [setFilter]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`${loaded ? "Search" : "Loading"} ${name}commands...`}
      searchBarAccessory={
        !loaded ? undefined : (
          <SectionDropdown
            sections={options}
            onSectionFilter={setFilter}
            defaultValue="all-commands"
          />
        )
      }
    >
      {loading && loadingMessage ? (
        <List.Item
          title={loadingMessage}
          accessories={
            !loadingState
              ? undefined
              : [
                  {
                    tag: {
                      value: loadingState,
                      color: Color.SecondaryText,
                    },
                  },
                ]
          }
        />
      ) : loaded && app ? (
        <ListItems
          app={app}
          data={filter ? filteredData : data}
          refresh={refreshMenuItemsData}
        />
      ) : (
        <List.EmptyView
          icon="😔"
          title="Commands not found"
          description={`Unfortunately we couldn't retrieve any ${app?.name ? `${app.name} ` : ""}menu bar commands`}
        />
      )}
    </List>
  );
}

export default function Command() {
  return (
    <ErrorBoundary>
      <MenuNavigator />
    </ErrorBoundary>
  );
}
