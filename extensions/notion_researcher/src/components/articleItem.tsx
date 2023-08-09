import { ActionPanel, Detail, List, Icon, Color, Action } from "@raycast/api";
import { ArticleMetadata } from "arxivjs";

export function ArticleItem({ articleMetadata, onPush }: { articleMetadata: ArticleMetadata; onPush: () => void }) {
  return (
    <List.Item
      icon="list-icon.png"
      title={articleMetadata?.title ?? "No papers yet..."}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" onPush={onPush} target={<Detail markdown="Page created successfully!" />} />
        </ActionPanel>
      }
      accessories={[
        {
          text: { value: articleMetadata?.authors ? articleMetadata?.authors[0] : "", color: Color.Orange },
          icon: Icon.Person,
        },
        {
          tag: {
            value: articleMetadata?.categoryNames ? articleMetadata.categoryNames[0] : "",
            color: Color.Magenta,
          },
          icon: Icon.Stars,
        },
      ]}
    />
  );
}
