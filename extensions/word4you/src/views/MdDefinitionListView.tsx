import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { MdDefinitionListItem } from "../components/MdDefinitionListItem";
import { useSavedMdDefinitions } from "../hooks/useSavedMdDefinitions";
import { useMdDefinitionSearch } from "../hooks/useMdDefinitionSearch";
import { useMdDefinitionFiltering } from "../hooks/useMdDefinitionFiltering";
import { useMdDefinitionSave } from "../hooks/useMdDefinitionSave";
import { useMdDefinitionDelete } from "../hooks/useMdDefinitionDelete";
import { useMdDefinitionUpdate } from "../hooks/useMdDefinitionUpdate";

interface MdDefinitionListViewProps {
  initialText?: string;
}

export function MdDefinitionListView({ initialText }: MdDefinitionListViewProps) {
  // Saved md definitions management
  const { savedMdDefinitions, isLoadingSaved, savedMdDefinitionsMap, loadSavedMdDefinitions } = useSavedMdDefinitions();

  // Search functionality
  const { searchText, setSearchText, aiResult, isLoading, handleSearch, clearAiResult } = useMdDefinitionSearch(
    savedMdDefinitionsMap,
    isLoadingSaved,
    initialText,
  );

  // Md definition filtering
  const { allMdDefinitions } = useMdDefinitionFiltering(savedMdDefinitions, aiResult, searchText);

  // Md definition operations
  const { handleSave } = useMdDefinitionSave(loadSavedMdDefinitions, clearAiResult);
  const { handleDelete } = useMdDefinitionDelete(loadSavedMdDefinitions);
  const { handleUpdate } = useMdDefinitionUpdate(loadSavedMdDefinitions);
  return (
    <List
      isLoading={isLoadingSaved || isLoading}
      searchBarPlaceholder="Enter text to filter or query with AI..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      isShowingDetail
    >
      {allMdDefinitions.length === 0 ? (
        isLoading ? (
          <List.EmptyView title="Querying..." icon={Icon.Cloud} description="Please wait while we query the text..." />
        ) : (
          <List.EmptyView
            title="No Definitions Found"
            description={
              searchText.trim()
                ? `No saved definitions match "${searchText}". Press Enter to query with AI.`
                : "You haven't saved any definitions yet. Enter text to query with AI."
            }
            actions={
              searchText.trim() ? (
                <ActionPanel>
                  <Action
                    title={`Query "${searchText}" with AI`}
                    icon={Icon.MagnifyingGlass}
                    onAction={() => handleSearch(searchText.trim())}
                  />
                </ActionPanel>
              ) : null
            }
          />
        )
      ) : (
        allMdDefinitions.map((mdDefinition) => {
          const isAiResult = aiResult && mdDefinition.text === aiResult.text;

          return (
            <MdDefinitionListItem
              key={`${mdDefinition.text}-${mdDefinition.timestamp}`}
              mdDefinition={mdDefinition}
              isAiResult={isAiResult}
              onSave={handleSave}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          );
        })
      )}
    </List>
  );
}
