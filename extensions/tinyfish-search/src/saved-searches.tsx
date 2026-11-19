import { Action, ActionPanel, Alert, confirmAlert, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { SaveSearchForm } from "./components/library-actions";
import { filterSummary } from "./content";
import { library } from "./library";
import type { SearchRecipe } from "./library-store";

export default function SavedSearches() {
  const { data, isLoading, revalidate } = usePromise(async () => ({
    saved: await library.listSearches(),
    history: await library.listHistory(),
  }));
  async function update(action: () => Promise<void>) {
    try {
      await action();
      await revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not update searches" });
    }
  }
  const runSearch = (recipe: SearchRecipe) =>
    launchCommand({ name: "search", type: LaunchType.UserInitiated, context: recipe });
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Find saved and recent searches…">
      <List.EmptyView
        title="No saved or recent searches"
        description="Search the web, then use Save Search to keep the query and filters."
        icon={Icon.Bookmark}
        actions={
          <ActionPanel>
            <Action
              title="Search Web"
              icon={Icon.MagnifyingGlass}
              onAction={() => launchCommand({ name: "search", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
      <List.Section title="Saved Searches">
        {data?.saved.map((entry) => (
          <List.Item
            key={entry.id}
            title={entry.title}
            subtitle={entry.recipe.query === entry.title ? filterSummary(entry.recipe.filters) : entry.recipe.query}
            icon={entry.pinned ? Icon.Pin : Icon.Bookmark}
            keywords={[entry.recipe.query]}
            actions={
              <ActionPanel>
                <Action title="Run Search" icon={Icon.MagnifyingGlass} onAction={() => runSearch(entry.recipe)} />
                <Action
                  title={entry.pinned ? "Unpin Search" : "Pin Search"}
                  icon={Icon.Pin}
                  onAction={() => update(() => library.pinSearch(entry.id, !entry.pinned))}
                />
                <Action.Push
                  title="Rename Search"
                  icon={Icon.Pencil}
                  target={
                    <SaveSearchForm
                      recipe={entry.recipe}
                      initialTitle={entry.title}
                      onSaved={() => void revalidate()}
                    />
                  }
                />
                <Action
                  title="Delete Saved Search"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => update(() => library.removeSearch(entry.id))}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Recent Searches" subtitle="Last 100 searches">
        {data?.history.map((entry) => (
          <List.Item
            key={entry.id}
            title={entry.recipe.query}
            subtitle={filterSummary(entry.recipe.filters)}
            icon={Icon.Clock}
            accessories={[{ date: new Date(entry.lastUsedAt) }]}
            actions={
              <ActionPanel>
                <Action title="Run Search" icon={Icon.MagnifyingGlass} onAction={() => runSearch(entry.recipe)} />
                <Action.Push
                  title="Save Search"
                  icon={Icon.Bookmark}
                  target={<SaveSearchForm recipe={entry.recipe} onSaved={() => void revalidate()} />}
                />
                <Action
                  title="Remove from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => update(() => library.removeHistory(entry.id))}
                />
                <Action
                  title="Clear Search History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Clear search history?",
                        message: "Saved searches will remain available.",
                        primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
                      })
                    )
                      await update(() => library.clearHistory());
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
