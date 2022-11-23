import { Action, ActionPanel, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useMe, useSubscriptions } from "../lib/hooks";
import { BlocksItem, Item, ImageData, LinkData } from "../lib/types";

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

          return `### [${title}](${link})

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

        default:
          console.warn(`Unknown block type: ${block.type}`);
          return "";
      }
    })
    .join("\n");
};

const ItemDetail = ({ item }: { item: Item }) => {
  const link = item.settings?.link?.value;

  const blocksMarkdown = useMemo(() => {
    return blocksToMarkdownRenderer(item.content.blocks);
  }, [item.content.blocks]);

  const markdown = useMemo(() => {
    return `# ${item.title}

## ${item.subtitle}

${blocksMarkdown}
`;
  }, [blocksMarkdown, item.subtitle, item.title]);

  return (
    <List.Item
      key={item.id}
      title={item.title}
      subtitle={item.subtitle}
      actions={<ActionPanel>{link && <Action.OpenInBrowser title="Open in Browser" url={link} />}</ActionPanel>}
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
        <ItemDetail key={item.id} item={item} />
      ))}
    </List>
  );
}
