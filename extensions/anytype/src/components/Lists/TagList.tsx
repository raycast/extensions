import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useTags } from "../../hooks/useTags";
import { Space } from "../../models";
import { hexToColor } from "../../utils";
import { CreateTagForm } from "../CreateForm/CreateTagForm";
import { EmptyViewTag } from "../EmptyView/EmptyViewTag";
import { UpdateTagForm } from "../UpdateForm/UpdateTagForm";

interface TagListProps {
  space: Space;
  propertyId: string;
}

export function TagList({ space, propertyId }: TagListProps) {
  const [searchText, setSearchText] = useState("");
  const { tags, isLoadingTags, tagsError, mutateTags, tagsPagination } = useTags(space.id, propertyId);

  useEffect(() => {
    if (tagsError) {
      showFailureToast(tagsError, { title: "Failed to fetch tags" });
    }
  }, [tagsError]);

  const handleRefresh = async () => {
    await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing tags...",
    });
    try {
      await mutateTags();
      await showToast({ style: Toast.Style.Success, title: "Tags refreshed" });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to refresh tags" });
    }
  };

  const filteredTags = tags?.filter((tag) => tag.name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List
      isLoading={isLoadingTags}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tags..."
      navigationTitle={`Browse ${space.name}`}
      pagination={tagsPagination}
      throttle={true}
    >
      {filteredTags && filteredTags.length > 0 ? (
        filteredTags.map((tag) => (
          <List.Item
            key={tag.id}
            title={tag.name}
            icon={{ source: Icon.Tag, tintColor: tag.color, tooltip: `Color: ${hexToColor[tag.color]}` }}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Pencil}
                  title="Edit Tag"
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={
                    <UpdateTagForm spaceId={space.id} propertyId={propertyId} tag={tag} mutateTags={mutateTags} />
                  }
                />
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icon.Plus}
                    title="Create Tag"
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={
                      <CreateTagForm spaceId={space.id} propertyId={propertyId} draftValues={{ name: searchText }} />
                    }
                  />
                  <Action
                    icon={Icon.RotateClockwise}
                    title="Refresh Tags"
                    onAction={handleRefresh}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      ) : (
        <EmptyViewTag
          title="No Tags Found"
          spaceId={space.id}
          propertyId={propertyId}
          contextValues={{
            name: searchText,
          }}
        />
      )}
    </List>
  );
}
