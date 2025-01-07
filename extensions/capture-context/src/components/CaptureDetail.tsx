import { List } from "@raycast/api";
import type { CapturedData } from "../utils";

export function CaptureDetail({ data }: { data: CapturedData }) {
  const markdown = `
${data.content.text ? `${data.content.text}\n\n` : ""}
${data.content.screenshot ? `![Screenshot](${data.content.screenshot})\n` : ""}
`;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Timestamp"
            text={new Date(data.metadata.timestamp).toLocaleString()}
          />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Source" text={data.source.app || "Unknown"} />
          <List.Item.Detail.Metadata.Label title="Bundle ID" text={data.source.bundleId || "None"} />

          {data.source.url && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="URL" target={data.source.url} text={data.source.url} />
            </>
          )}

          {data.metadata.comment && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Comment" text={data.metadata.comment} />
            </>
          )}

          {data.content.html && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="HTML Preview" text={`${data.content.html.slice(0, 200)}...`} />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
