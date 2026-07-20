import { useState, useMemo } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";

import { withQuery, CacheActions } from "@/components";
import { useJiraFieldsQuery, useRefetchWithToast, useJiraSelectedFieldsCachedState } from "@/hooks";
import type { JiraField, ProcessedJiraField } from "@/types";

const EMPTY_FIELDS: ProcessedJiraField[] = [];

export default withQuery(JiraManageFields);

function JiraManageFields() {
  const [searchText, setSearchText] = useState("");
  const {
    fields: selectedFields,
    addField: addSelectedField,
    removeField: removeSelectedField,
  } = useJiraSelectedFieldsCachedState();

  const {
    data = EMPTY_FIELDS,
    isLoading,
    isSuccess,
    refetch,
  } = useJiraFieldsQuery({
    meta: { errorMessage: "Failed to Load Fields" },
  });

  const refetchWithToast = useRefetchWithToast({ refetch });

  const { addedFieldsFiltered, systemFields, customFields } = useMemo(() => {
    const trimmedText = searchText.trim();
    const allFields = data ?? [];
    const searchRegex = new RegExp(trimmedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const filteredFields = allFields.filter((item) => {
      if (searchRegex.test(item.name)) {
        return true;
      }
      if (item.keywords && item.keywords.some((keyword) => searchRegex.test(keyword))) {
        return true;
      }
      return false;
    });

    const addedFieldIds = selectedFields.map((item) => item.id);
    const addedFieldsFiltered = filteredFields.filter((item) => addedFieldIds.includes(item.id));

    return {
      addedFieldsFiltered,
      systemFields: filteredFields.filter((item) => !item.custom),
      customFields: filteredFields.filter((item) => item.custom),
    };
  }, [data, searchText, selectedFields]);

  const noFieldsAvailable = isSuccess && !data.length;

  const noFilteredResults =
    isSuccess &&
    data.length &&
    searchText.length > 0 &&
    !addedFieldsFiltered.length &&
    !systemFields.length &&
    !customFields.length;

  const handleToggleField = (field: ProcessedJiraField) => {
    const isAdded = selectedFields.some((item) => item.id === field.id);

    if (isAdded) {
      removeSelectedField(field.id);
    } else {
      const jiraField: JiraField = {
        id: field.id,
        name: field.name,
        custom: field.custom,
        schema: field.schema,
        orderable: true,
        navigable: true,
        searchable: true,
        clauseNames: [field.id],
      };
      addSelectedField(jiraField);
    }
  };

  return (
    <List
      throttle
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter by name, id, type..."
    >
      {noFieldsAvailable || noFilteredResults ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={noFieldsAvailable ? "No Fields Available" : "No Results"}
          description={noFilteredResults ? "Try adjusting your search filters" : undefined}
        />
      ) : (
        <>
          {addedFieldsFiltered.length > 0 && (
            <List.Section title={`Added Fields (${addedFieldsFiltered.length})`}>
              {addedFieldsFiltered.map((item) => {
                const updatedAccessories = [
                  {
                    icon: Icon.Checkmark,
                    tooltip: "Included in search",
                  },
                  ...(item.accessories ?? []),
                ];

                const isUserFieldItem = item.schema?.type === "user";

                return (
                  <List.Item
                    key={item.renderKey}
                    title={item.title}
                    subtitle={item.subtitle}
                    accessories={updatedAccessories}
                    keywords={item.keywords}
                    actions={
                      <ActionPanel>
                        {isUserFieldItem && (
                          <Action
                            title="Remove from Search"
                            icon={Icon.Minus}
                            onAction={() => handleToggleField(item)}
                          />
                        )}
                        <Action.CopyToClipboard title="Copy Field ID" content={item.id} />
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                          onAction={refetchWithToast}
                        />
                        <CacheActions />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}

          {customFields.length > 0 && (
            <List.Section title={`Custom Fields (${customFields.length})`}>
              {customFields.map((item) => {
                const accessories = item.accessories;
                const isAdded = selectedFields.some((i) => i.id === item.id);
                const isUserFieldItem = item.schema?.type === "user";
                const updatedAccessories = isAdded
                  ? [
                      {
                        icon: Icon.Checkmark,
                        tooltip: "Included in search",
                      },
                      ...(accessories ?? []),
                    ]
                  : (accessories ?? []);

                return (
                  <List.Item
                    key={item.id}
                    title={item.name}
                    subtitle={item.subtitle}
                    accessories={updatedAccessories}
                    keywords={item.keywords}
                    actions={
                      <ActionPanel>
                        {isUserFieldItem && (
                          <Action
                            title={isAdded ? "Remove from Search" : "Add to Search"}
                            icon={isAdded ? Icon.Minus : Icon.Plus}
                            onAction={() => handleToggleField(item)}
                          />
                        )}
                        <Action.CopyToClipboard title="Copy Field ID" content={item.id} />
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                          onAction={refetchWithToast}
                        />
                        <CacheActions />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}

          {systemFields.length > 0 && (
            <List.Section title={`System Fields (${systemFields.length})`}>
              {systemFields.map((item) => (
                <List.Item
                  key={item.renderKey}
                  title={item.name}
                  subtitle={item.subtitle}
                  accessories={item.accessories}
                  keywords={item.keywords}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Field ID" content={item.id} />
                      <CacheActions />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
