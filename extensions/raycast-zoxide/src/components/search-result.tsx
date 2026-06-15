import { ActionPanel, Action, List, open, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useCachedState, showFailureToast } from "@raycast/utils";
import { SearchUsingSpotlightAction } from "@components/search-using-spotlight-action";
import { useZoxide } from "@hooks/use-zoxide";
import { basename, dirname } from "path";
import { base64ShellSanitize } from "@utils/misc";

export const SearchResult = ({
  searchResult,
  searchText,
  onBoost,
}: {
  searchResult: SearchResult;
  searchText?: string;
  onBoost?: () => void;
}) => {
  const [, setRemovedKeys] = useCachedState<string[]>("removed-keys", []);
  // appPicker prefs are required with defaults, so always set at runtime — the
  // generated `Preferences` type marks them optional, hence the assertions.
  const prefs = getPreferenceValues<Preferences>();
  const openIn = prefs["open-in"]!;
  const terminal = prefs["open-in-terminal"]!;
  const editor = prefs["open-in-editor"]!;

  const { revalidate: addQuery } = useZoxide(`add "${base64ShellSanitize(searchResult.originalPath)}"`, {
    keepPreviousData: false,
    execute: false,
  });

  const { revalidate: removeQuery } = useZoxide(`remove "${base64ShellSanitize(searchResult.originalPath)}"`, {
    keepPreviousData: false,
    execute: false,
  });

  const folder = basename(searchResult.path);
  const parent = dirname(searchResult.path) === "." ? "/" : dirname(searchResult.path);

  // Mirror the configured "open in" app (required preference, always set): the
  // Finder icon when it's Finder, otherwise the chosen app's name + folder icon.
  const isFinder = openIn.bundleId === "com.apple.finder";
  const openTitle = `Open in ${openIn.name}`;
  const openIcon = isFinder ? Icon.Finder : Icon.Folder;

  // Avoid duplicate "Open in <app>" entries: only show the terminal/editor
  // actions when they target an app not already represented by another action.
  const showTerminal = terminal.bundleId !== openIn.bundleId;
  const showEditor = editor.bundleId !== openIn.bundleId && editor.bundleId !== terminal.bundleId;

  // Opening a result counts as a visit, so boost its score in zoxide first.
  // Pass a bundle id, not an app name — `open(path, "Finder")` by name lands on AirDrop.
  const openIn_ = async (bundleId: string | undefined, failureTitle: string) => {
    try {
      await addQuery();
      if (bundleId) await open(searchResult.originalPath, bundleId);
      else await open(searchResult.originalPath);
    } catch (error) {
      showFailureToast(error, { title: failureTitle });
    }
  };

  const openResult = () => openIn_(openIn.bundleId, "Failed to open folder");

  const boostResult = async () => {
    try {
      await addQuery();
      showToast({
        style: Toast.Style.Success,
        title: "Boosted in Zoxide",
        message: searchResult.path,
      });
      onBoost?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to boost score" });
    }
  };

  const removeResult = async () => {
    try {
      await removeQuery();
      setRemovedKeys((prev) => prev.concat([searchResult.key]));
      showToast({
        style: Toast.Style.Success,
        title: "Removed from zoxide",
        message: searchResult.path,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to remove from zoxide" });
    }
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
            <Action title={openTitle} icon={openIcon} onAction={openResult} />
            {showTerminal && (
              <Action
                title={`Open in ${terminal.name}`}
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => openIn_(terminal.bundleId, "Failed to open in terminal")}
              />
            )}
            {showEditor && (
              <Action
                title={`Open in ${editor.name}`}
                icon={Icon.Code}
                shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                onAction={() => openIn_(editor.bundleId, "Failed to open in editor")}
              />
            )}
            <Action.ShowInFinder path={searchResult.originalPath} shortcut={{ modifiers: ["cmd"], key: "f" }} />
            <Action.OpenWith path={searchResult.originalPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <SearchUsingSpotlightAction searchText={searchText || ""} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Path"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              content={searchResult.path}
            />
            <Action
              title="Boost in Zoxide"
              icon={Icon.ArrowUp}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={boostResult}
            />
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
