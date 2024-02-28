import { ActionPanel, List, Icon, Color, Action } from "@raycast/api";
import { ArticleMetadata } from "arxivjs";

export function ArticleItem({ articleMetadata, onAction }: { articleMetadata: ArticleMetadata; onAction: () => void }) {
  return (
    <List.Item
      icon="list_icon.png"
      title={articleMetadata?.title ?? "No papers yet..."}
      actions={
        <ActionPanel>
          <Action title="Add Paper" onAction={onAction} />
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
