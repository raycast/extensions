import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import url from "url";
import { useMe, useSubscriptions } from "../lib/hooks";
import { toCapitalize } from "../lib/utils";
import { BlocksItem, Item, ImageData, LinkData, EmbedData } from "../lib/types";

const renderEmbedData = (data: EmbedData) => {
  const { service, source } = data;

  switch (service) {
    case "youtube": {
      const videoId = new url.URL(source).searchParams.get("v");

      return `![${videoId}](https://img.youtube.com/vi/${videoId}/hqdefault.jpg)
      
[Watch on YouTube](${source})`;
    }
    default: {
      return `![${service}](${source})`;
    }
  }
};

const blocksToMarkdownRenderer = (blocks: BlocksItem[] = []): string => {
  return blocks
    .map((block) => {
      const data = block.data;
      switch (block.type) {
        case "linkTool": {
          const {
            meta: { image, title: _title, description: _description },
            link,
          } = data as LinkData;
          const description = _description.length > 150 ? _description.slice(0, 150) + "..." : _description;
          const title = _title.length > 100 ? _title.slice(0, 100) + "..." : _title;

          return `#### [${title}](${link})

> ${description}
${image?.url && `\n![${_title}](${image?.url})`}
          `;
        }

        case "image": {
          const {
            file: { url },
            caption,
          } = data as ImageData;

          return `![${caption}](${url})`;
        }

        case "embed": {
          return renderEmbedData(data as EmbedData);
        }

        case "paragraph": {
          return block.data.text;
        }

        default:
          console.warn(`Unknown block type: ${block.type}`);
          return "";
      }
    })
    .join("\n");
};

const ItemDetailMetadata = ({ item }: { item: Item }) => {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.TagList title="Collections">
        {item.collections.map((collection) => (
          <List.Item.Detail.Metadata.TagList.Item key={collection.id} text={`${collection.icon} ${collection.name}`} />
        ))}
      </List.Item.Detail.Metadata.TagList>

      {item.tags.length > 0 && (
        <List.Item.Detail.Metadata.TagList title="Tags">
          {item.tags.map((tag) => (
            <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}

      <List.Item.Detail.Metadata.Label title="Information" />

      {item.views && <List.Item.Detail.Metadata.Label title="Visits" text={item.views.toString()} />}

      <List.Item.Detail.Metadata.Label title="Status" text={toCapitalize(item.status)} />

      <List.Item.Detail.Metadata.Label title="Created" text={new Date(item.createdAt).toLocaleString()} />

      <List.Item.Detail.Metadata.Label title="Updated" text={new Date(item.updatedAt).toLocaleString()} />
    </List.Item.Detail.Metadata>
  );
};

const useItemRenderData = (item: Item) => {
  const link = item.settings?.link?.value;

  const blocksMarkdown = useMemo(() => {
    return blocksToMarkdownRenderer(item.content.blocks);
  }, [item.content.blocks]);

  const markdown = useMemo(() => {
    return `## ${item.title}

### ${item.subtitle}

${blocksMarkdown}
`;
  }, [blocksMarkdown, item.subtitle, item.title]);

  return { link, markdown };
};

const ItemDetail = ({ item }: { item: Item }) => {
  const { markdown, link } = useItemRenderData(item);

  return (
    <Detail
      markdown={markdown}
      actions={<ActionPanel>{link && <Action.OpenInBrowser url={link} title="Open in Browser" />}</ActionPanel>}
      metadata={<ItemDetailMetadata item={item} />}
    />
  );
};

const ItemListDetail = ({ item }: { item: Item }) => {
  const { markdown, link } = useItemRenderData(item);

  return (
    <List.Item
      key={item.id}
      title={item.title}
      subtitle={item.subtitle}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={<ItemDetail item={item} />} icon={Icon.Sidebar} />
          {link && <Action.OpenInBrowser title="Open in Browser" url={link} />}
        </ActionPanel>
      }
      detail={<List.Item.Detail markdown={markdown} />}
    />
  );
};

export default function Login() {
  const { isLoading: isLogging, data: userResponse, error } = useMe();
  const [page, setPage] = useState(1);

  const fetchSubscriptions = !error && !!userResponse;

  const { isLoading, data: { data = [] } = {} } = useSubscriptions(page, fetchSubscriptions);

  const isListLoading = isLoading || isLogging;

  return (
    <List isLoading={isListLoading} isShowingDetail={true}>
      {data.map((item: any) => (
        <ItemListDetail key={item.id} item={item} />
      ))}
    </List>
  );
}
