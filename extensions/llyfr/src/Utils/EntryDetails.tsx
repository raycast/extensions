import { ActionPanel, Detail, Action, Icon } from "@raycast/api";

import { IEntryDetails } from "./types";
import { OpenFileAction, OpenInBrowserAction } from "./Actions";
import DownloadAction from "./DownloadAction";

export default function EntryDetails({
  entry,
  remote,
  path,
  api_token,
}: {
  entry: IEntryDetails;
  remote: boolean;
  path?: string;
  api_token?: string;
}) {
  let markdown = `# ${entry.title}\n\n`;
  if (entry.abstract) {
    markdown += `${entry.abstract}\n\n`;
  }
  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Authors" text={entry.authors.join(", ")} />
          {entry.journal ? <Detail.Metadata.Label title="Journal" text={entry.journal} /> : null}
          <Detail.Metadata.Label title="Year" text={entry.year.toString()} />
          {entry.file ? <Detail.Metadata.Label title="File" text={entry.file} /> : null}
          {entry.url ? <Detail.Metadata.Link title="URL" text={entry.url} target={entry.url} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!remote && path ? <OpenFileAction entry={entry} path={path} /> : null}
          {remote && path && entry.bibcode && api_token ? (
            <DownloadAction bibcode={entry.bibcode} api_token={api_token} />
          ) : null}
          <OpenInBrowserAction entry={entry} />
          <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy BibTeX" content={entry.bibtex} />
        </ActionPanel>
      }
    />
  );
}
