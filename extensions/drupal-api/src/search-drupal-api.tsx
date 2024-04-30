import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";
import { getDrupalApiResults } from "./util";
import { DrupalVersionMachineCode, SearchState } from "./types";
import Dropdown from "./dropdown";

const Command = () => {
  const [state, setState] = useState<SearchState>({});
  const [searchText, setSearchText] = useState<string>("");
  const [drupalVersion, setDrupalVersion] = useState<DrupalVersionMachineCode>(DrupalVersionMachineCode.Drupal10);

  useEffect(() => {
    async function fetchRecords() {
      try {
        setState({ records: state.records, loading: true });
        const feed = await getDrupalApiResults(drupalVersion, searchText || "");
        setState({ records: feed, loading: false });
      } catch (error) {
        console.error(error);
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchRecords();
  }, [searchText, drupalVersion]);

  let noResultsText = "";
  if (state.error) {
    noResultsText = "Error: " + state.error.message;
  }
  if (!state.loading && !state.records?.length) {
    if (searchText) {
      noResultsText = "No items matched your search query.";
    } else {
      noResultsText = "Please type something to search.";
    }
  }

  return (
    <List
      isLoading={state.loading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search the Drupal API..."
      isShowingDetail
      searchBarAccessory={<Dropdown onVersionChange={setDrupalVersion} />}
    >
      <List.EmptyView title={noResultsText}></List.EmptyView>
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
                <Action.CopyToClipboard title="Copy Drupal Location to Clipboard" content={item.location} />
                <Action.CopyToClipboard title="Copy Title to Clipboard" content={item.title} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default Command;
