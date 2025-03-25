import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { drupalVersions, getDrupalApiResults } from "./utils/search-api/util";
import { ApiItem } from "./utils/search-api/types";
import { CommandState, DrupalVersionMachineCode } from "./utils/general/types";

const SearchApi = () => {
  const [state, setState] = useState<CommandState<ApiItem[]>>({});
  const [searchText, setSearchText] = useState<string>("");
  const [drupalVersion, setDrupalVersion] = useState<DrupalVersionMachineCode>(DrupalVersionMachineCode.Drupal10);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setState({ records: state.records, loading: true });
        const feed = await getDrupalApiResults(drupalVersion, searchText);
        setState({ records: feed, loading: false });
      } catch (error) {
        console.error(error);
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    };

    fetchRecords();
  }, [searchText, drupalVersion]);

  let noResultsText = "No results...";
  let noResultsIcon: Icon | null = Icon.Important;
  if (!state.loading && !searchText) {
    noResultsText = "Type something to search.";
    noResultsIcon = null;
  }
  if (state.error) {
    noResultsText = "Error: " + state.error.message;
  }
  if (state.loading) {
    noResultsText = "Loading...";
    noResultsIcon = Icon.CircleProgress;
    if (searchText) {
      noResultsText = "Searching...";
    }
  }

  const VersionDropdown = () => (
    <List.Dropdown
      tooltip="Select Drupal version to search in"
      storeValue={true}
      onChange={(newValue) => {
        setDrupalVersion(newValue as DrupalVersionMachineCode);
      }}
    >
      <List.Dropdown.Section title="Drupal versions">
        {drupalVersions.map(({ name, code }) => (
          <List.Dropdown.Item key={code} title={name} value={code} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  return (
    <List
      isLoading={state.loading || !state.records}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search the Drupal API..."
      isShowingDetail
      searchBarAccessory={<VersionDropdown />}
      filtering={false}
    >
      <List.EmptyView title={noResultsText} icon={noResultsIcon} />
      {state.records?.map((item, index) => {
        const detailsMarkdown = `# ${item.title}\n\n**Type:** ${item.type}\n\n**Description**: ${item.description}\n\n**Location**: ${item.location}\n\n[Go to Drupal.org](${item.url})`;

        return (
          <List.Item
            key={index}
            title={item.title}
            accessories={[{ text: item.type }]}
            detail={<List.Item.Detail markdown={detailsMarkdown} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard title="Copy URL to Clipboard" content={item.url} />
                <Action.CopyToClipboard
                  title="Copy Drupal Location to Clipboard"
                  content={item.location}
                  shortcut={{ modifiers: ["opt", "cmd"], key: "l" }}
                />
                <Action.CopyToClipboard
                  title="Copy Title to Clipboard"
                  content={item.title}
                  shortcut={{ modifiers: ["opt", "cmd"], key: "t" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default SearchApi;
