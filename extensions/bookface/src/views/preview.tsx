import { Action, ActionPanel, Detail } from "@raycast/api";

type Metadata = Array<{ label: string; value: string }>;

export function MarkdownPreview({
  title,
  body,
  url,
  metadata,
}: {
  title: string;
  body: string;
  url: string;
  metadata?: Metadata;
}) {
  const markdown = `# ${title}\n\n${body}`;
  return (
    <Detail
      markdown={markdown}
      navigationTitle={title}
      metadata={
        metadata && metadata.length > 0 ? (
          <Detail.Metadata>
            {metadata.map((m) => (
              <Detail.Metadata.Label
                key={m.label}
                title={m.label}
                text={m.value}
              />
            ))}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="Source"
              target={url}
              text="Open in Bookface"
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard title="Copy Body" content={body} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
