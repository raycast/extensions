import { useCachedPromise } from "@raycast/utils";
import { search } from "./owncloud";
import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useState } from "react";
import { filesize } from "filesize";

const { url } = getPreferenceValues<Preferences>();

const getFileIcon = (name: string) => {
  const type = name.split(".").pop();
  switch (type) {
    case "jpg":
      return "filetypes/image.svg";
    case "odt":
      return "filetypes/x-office-document.svg";
    case "pdf":
      return "filetypes/application-pdf.svg";
    default:
      return Icon.Document;
  }
};
const getPath = (name: string) => {
  const parts = name.split("/");
  // Find the index of "files"
  const idx = parts.indexOf("files");
  // Everything after username (idx + 2), except the last (the filename)
  const dirOnly = parts.slice(idx + 2, parts.length - 1).join("/");
  return "/" + decodeURIComponent(dirOnly);
};

export default function SearchFiles() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data: results } = useCachedPromise(
    async (query: string) => {
      const data = await search(query);
      return data;
    },
    [searchText],
    {
      execute: !!searchText.trim(),
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} throttle onSearchTextChange={setSearchText}>
      {results.map((result) => (
        <List.Item
          key={result.id}
          icon={result.isCollection ? "folder.svg" : getFileIcon(result.name)}
          title={result.name}
          subtitle={getPath(result.href)}
          accessories={[{ text: filesize(result.size) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={new URL(`index.php/apps/files/?dir=${encodeURIComponent(getPath(result.href))}`, url).toString()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
