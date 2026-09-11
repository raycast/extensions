import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { DocItem, fetchDocPage } from "../api/rustdoc";

interface DocDetailProps {
  item: DocItem;
}

export default function DocDetail({ item }: DocDetailProps) {
  const { isLoading, data } = usePromise(fetchDocPage, [item.url]);

  const markdown = data
    ? `# ${item.name}\n\n${data}`
    : `# ${item.name}\n\nLoading documentation...`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={item.path}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={item.type} />
          <Detail.Metadata.Label title="Path" text={item.path} />
          <Detail.Metadata.Link
            title="Read Online"
            target={item.url}
            text="Open in Browser"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={item.url} />
          <Action.CopyToClipboard content={item.path} title="Copy Path" />
          <Action.CopyToClipboard content={item.url} title="Copy URL" />
        </ActionPanel>
      }
    />
  );
}
