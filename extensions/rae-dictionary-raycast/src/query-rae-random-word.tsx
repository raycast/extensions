import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { getRandomWord } from "./api/rae";
import { WordEntryFC } from "./components/WordEntry";

export default function Command() {
  const { data: wordEntry, isLoading, error, revalidate } = usePromise(getRandomWord);

  if (error) {
    showFailureToast(error, { title: "Could not load random word" });
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Random word from RAE dictionary"
      searchBarPlaceholder="Loading random word..."
      actions={
        <ActionPanel>
          <Action
            title="Load Another Random Word"
            onAction={revalidate}
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't load a random word"
          description={`${error.message}. Try again.`}
          actions={
            <ActionPanel>
              <Action title="Try Again" onAction={revalidate} icon={Icon.Repeat} />
            </ActionPanel>
          }
        />
      ) : wordEntry ? (
        <WordEntryFC wordEntry={wordEntry} />
      ) : null}
    </List>
  );
}
