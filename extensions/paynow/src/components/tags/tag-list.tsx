import { Action, ActionPanel } from "@raycast/api";
import { useStore } from "../../providers/store-provider/store-provider";
import { useTagsList } from "../../queries/tags/list-tags.query";
import ListContainer from "../list-container";
import TagDetails from "./tag-details";
import TagListItem from "./tag-list-item";

const TagList = () => {
  const { data: tags, isLoading } = useTagsList();
  const { store } = useStore();

  return (
    <ListContainer isLoading={isLoading} navigationTitle={`Tags • ${store?.name || "No Store Selected"}`}>
      {tags?.map((tag) => (
        <TagListItem
          key={tag.id}
          tag={tag}
          actions={
            <ActionPanel title={tag.name}>
              <Action.Push title="View Details" target={<TagDetails tag={tag} />} />
              <Action.CopyToClipboard title="Copy Tag ID" content={tag.id} />
              <Action.OpenInBrowser title="Open" url={`https://dashboard.paynow.gg/tags/${tag.id}?s=${store?.slug}`} />
            </ActionPanel>
          }
        />
      ))}
    </ListContainer>
  );
};

export default TagList;
