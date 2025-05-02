import { ActionPanel, Action, List, open, Icon, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { AddFromFinderAction } from "@components/add-from-finder-action";
import { useZoxide } from "@hooks/use-zoxide";
import { basename, dirname } from "path";

export const SearchResult = ({ searchResult }: { searchResult: SearchResult }) => {
  const [, setRemovedKeys] = useCachedState<string[]>("removed-keys", []);

  const { revalidate: addQuery } = useZoxide(`add "${searchResult.originalPath}"`, {
    keepPreviousData: false,
    execute: false,
  });

  const { revalidate: removeQuery } = useZoxide(`remove "${searchResult.originalPath}"`, {
    keepPreviousData: false,
    execute: false,
  });

  const folder = basename(searchResult.path);
  const parent = dirname(searchResult.path) == "." ? "/" : dirname(searchResult.path);

  const openResult = async () => {
    await addQuery();
    open(searchResult.originalPath);
  };

  const removeResult = async () => {
    await removeQuery();
    setRemovedKeys((prev) => prev.concat([searchResult.key]));
    showToast({
      style: Toast.Style.Success,
      title: "Removed from zoxide",
      message: searchResult.path,
    });
  };

  return (
    <List.Item
      id={searchResult.key}
      title={folder}
      subtitle={parent}
      icon={{ fileIcon: searchResult.originalPath || searchResult.path }}
      accessories={[{ tag: { value: searchResult.score || "0.0" } }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open Folder" onAction={openResult} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Path"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              content={searchResult.path}
            />
            <AddFromFinderAction />
            {searchResult.score && (
              <Action
                title="Remove Result"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                style={Action.Style.Destructive}
                onAction={removeResult}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export interface SearchResult {
  key: string;
  path: string;
  originalPath: string;
  score?: string;
}

export default SearchResult;
