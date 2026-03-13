import { Action, ActionPanel, List } from "@raycast/api";
import filesize from "file-size";
import { SearchResult, useSearch } from "./hooks";
import { getIcon } from "./utils";
import { BASE_URL } from "../config";

export function Search() {
  const { results, isLoading, search } = useSearch();

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Search files..." throttle>
      <List.Section title="Results" subtitle={String(results.length)}>
        {results.map((result) => (
          <Item key={result.fileId} result={result} />
        ))}
      </List.Section>
    </List>
  );
}

function Item({ result }: { result: SearchResult }) {
  const url = result.contentType
    ? `${BASE_URL}/apps/files/?dir=${encodeURI(result.dirname)}&openfile=${result.fileId}`
    : `${BASE_URL}/apps/files/?dir=${encodeURI(result.fullpath)}&view=files`;
  const approxFileSize = filesize(result.size).human("si");

  return (
    <List.Item
      title={result.filename}
      subtitle={result.dirname}
      accessoryTitle={approxFileSize}
      icon={getIcon(result.contentType)}
      actions={
        <ActionPanel title={result.filename}>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
