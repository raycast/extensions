import { Action, ActionPanel, Detail } from '@raycast/api';
import { createNodeDocsUrl } from '../helpers';
import { useReleaseNotes } from '../hooks/useReleaseNotes';

type NodeVersionDetailProps = {
  version: string;
  tagListItems?: React.ComponentProps<typeof Detail.Metadata.TagList.Item>[];
};

export function NodeReleaseDetail({ version, tagListItems }: NodeVersionDetailProps) {
  const { data, isLoading, error } = useReleaseNotes(version);
  const markdown = `# ${version}\n## Release Name: \n${data?.name ?? ''}\n\n${data?.body || error?.message || ''}`;
  const docsUrl = createNodeDocsUrl(version);
  const publishedDate = data && new Date(data.published_at).toLocaleString();

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Details for Node ${version}`}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Published" text={publishedDate} />
            <Detail.Metadata.Link title="Release Notes URL" text={data.html_url} target={data.html_url} />
            <Detail.Metadata.Link title="Docs" text={docsUrl} target={docsUrl} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Tags">
              {tagListItems?.map((props) => <Detail.Metadata.TagList.Item key={props.text} {...props} />)}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
      actions={
        data && (
          <ActionPanel>
            <ActionPanel.Section title="Open in Browser">
              <Action.OpenInBrowser url={data.html_url} title="Open Release Notes" />
              <Action.OpenInBrowser url={docsUrl} title="Open Docs" />
            </ActionPanel.Section>
            <ActionPanel.Section title="Copy to Clipboard">
              <Action.CopyToClipboard title="Copy Version" content={version} />
              <Action.CopyToClipboard title="Copy Release Notes URL" content={data.html_url} />
              <Action.CopyToClipboard title="Copy Docs URL" content={docsUrl} />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}
