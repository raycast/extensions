import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listTags } from "./api";
import { TagObjectList, shouldIncludeTagInBrowser } from "./components/TagObjectList";
import { getErrorEmptyView } from "./error-utils";

export default function SearchTagsCommand() {
  const {
    data: tags = [],
    error,
    isLoading,
  } = useCachedPromise(() => listTags(), [], {
    onError: (error) => {
      void showFailureToast(error, { title: "Couldn't load your tags" });
    },
  });
  const visibleTags = tags.filter(shouldIncludeTagInBrowser);
  const errorEmptyView = error ? getErrorEmptyView(error, "Couldn't load your tags") : undefined;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tags…">
      {visibleTags.length === 0 ? (
        <List.EmptyView
          title={errorEmptyView?.title ?? "No Tags"}
          description={errorEmptyView?.description ?? "You haven't created any tags yet."}
        />
      ) : null}
      {visibleTags.map((tag) => (
        <List.Item
          key={tag.name}
          icon={Icon.Tag}
          title={tag.name}
          accessories={tag.count ? [{ text: `${tag.count}` }] : undefined}
          actions={
            <ActionPanel>
              <Action.Push title="Show Items" target={<TagObjectList tag={tag} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
