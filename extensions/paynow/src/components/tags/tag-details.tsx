import { Action, ActionPanel, List } from "@raycast/api";
import { withProviders } from "../../hocs/with-providers";
import { useStore } from "../../providers/store-provider/store-provider";
import type { ManagementSchemas } from "@paynow-gg/typescript-sdk";

export interface TagDetailsProps {
  tag: ManagementSchemas["TagDto"];
}

const Line = ({
  name,
  value,
  hidden = false,
  tagId,
}: {
  name: string;
  value: string;
  hidden?: boolean;
  tagId: string;
}) => {
  const { store } = useStore();

  if (hidden) return null;
  return (
    <List.Item
      title={name}
      accessories={[{ text: value }]}
      keywords={[value, name + value, value + name]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Value" content={value} />
          <Action.OpenInBrowser title="Open" url={`https://dashboard.paynow.gg/tags/${tagId}?s=${store?.slug}`} />
        </ActionPanel>
      }
    />
  );
};

const TagDetails = ({ tag }: TagDetailsProps) => {
  return (
    <List navigationTitle={tag.name}>
      <Line tagId={tag.id} name="ID" value={tag.id} />
      <Line tagId={tag.id} name="Name" value={tag.name} />
      <Line tagId={tag.id} name="Slug" value={tag.slug} />
      <Line
        tagId={tag.id}
        name="Created At"
        value={new Date(tag.created_at || 0).toLocaleString()}
        hidden={!tag.created_at}
      />
      <Line
        tagId={tag.id}
        name="Updated At"
        value={new Date(tag.updated_at || 0).toLocaleString()}
        hidden={!tag.updated_at}
      />
      {tag.image_url && (
        <List.Item
          title="Image"
          accessories={[{ icon: tag.image_url || undefined }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Image URL" content={tag.image_url || ""} />
              <Action.OpenInBrowser title="Open Image" url={tag.image_url} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};

export default withProviders(TagDetails);
