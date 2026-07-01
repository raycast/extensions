import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listTags } from "./api";
import { TagObjectList, shouldIncludeTagInBrowser } from "./components/TagObjectList";

export default function SearchTagsCommand() {
  const { data: tags = [], isLoading } = useCachedPromise(() => listTags(), [], {
    onError: (error) => {
      void showFailureToast(error, { title: "Couldn't load your tags" });
    },
  });
  const visibleTags = tags.filter(shouldIncludeTagInBrowser);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tags…">
      {visibleTags.length === 0 ? (
        <List.EmptyView title="No Tags" description="You haven't created any tags yet." />
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
