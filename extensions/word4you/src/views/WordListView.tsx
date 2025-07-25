import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { WordListItem } from "../components/WordListItem";
import { useSavedWords } from "../hooks/useSavedWords";
import { useWordSearch } from "../hooks/useWordSearch";
import { useWordFiltering } from "../hooks/useWordFiltering";
import { useWordSave } from "../hooks/useWordSave";
import { useWordDelete } from "../hooks/useWordDelete";
import { useWordUpdate } from "../hooks/useWordUpdate";

interface WordListViewProps {
  initialWord?: string;
}

export function WordListView({ initialWord }: WordListViewProps) {
  // Saved words management
  const { savedWords, isLoadingSaved, savedWordsMap, loadSavedWords } = useSavedWords();

  // Search functionality
  const { searchText, setSearchText, aiResult, isLoading, handleSearch, clearAiResult } = useWordSearch(
    savedWordsMap,
    isLoadingSaved,
    initialWord,
  );

  // Word filtering
  const { allWords } = useWordFiltering(savedWords, aiResult, searchText);

  // Word operations
  const { handleSave } = useWordSave(loadSavedWords, clearAiResult);
  const { handleDelete } = useWordDelete(loadSavedWords);
  const { handleUpdate } = useWordUpdate(loadSavedWords);
  return (
    <List
      isLoading={isLoadingSaved || isLoading}
      searchBarPlaceholder="Search words or enter new word to query"
      onSearchTextChange={setSearchText}
      searchText={searchText}
      isShowingDetail
    >
      {allWords.length === 0 ? (
        isLoading ? (
          <List.EmptyView title="Querying..." icon={Icon.Cloud} description="Please wait while we query the word..." />
        ) : (
          <List.EmptyView
            title="No Words Found"
            description={
              searchText.trim()
                ? `No saved words match "${searchText}". Press Enter to query with AI.`
                : "You haven't saved any words yet. Enter a word to query with AI."
            }
            actions={
              searchText.trim() ? (
                <ActionPanel>
                  <Action
                    title={`Query "${searchText}" with AI`}
                    icon="🤖"
                    onAction={() => handleSearch(searchText.trim())}
                  />
                </ActionPanel>
              ) : null
            }
          />
        )
      ) : (
        allWords.map((word, index) => {
          const isAiResult = aiResult && word.word === aiResult.word;

          return (
            <WordListItem
              key={`${word.word}-${word.timestamp}`}
              word={word}
              index={index}
              total={allWords.length}
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
