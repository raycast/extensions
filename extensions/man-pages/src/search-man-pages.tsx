import { Action, ActionPanel, List, useNavigation, launchCommand, LaunchType, Icon } from "@raycast/api";
import { runInTerminal, useGetManPages } from "./utils";
import { Results } from "./components/Results";
import { useEffect, useState } from "react";

interface ExportArguments {
  command?: string;
}

const MAX_LIST_RESULTS = 100;

const fuzzyMatch = (str1: string, str2: string) => {
  // Determines if two strings approximately match
  // This is used to filter list items beforehand, to avoid memory overflow
  let regexString = "";
  str1.split("").forEach((char) => {
    regexString += (char.match(/([[\])(+*.^$?])/g) ? "\\" : "") + char + ".{0,3}";
  });
  const rgx = new RegExp(regexString, "i");
  return str2.match(rgx);
};

export default function Main(props: { arguments: ExportArguments }) {
  const { command } = props.arguments;
  const { push } = useNavigation();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredList, setFilteredList] = useState<string[]>([]);
  const pages = useGetManPages();

  // User provided a command -- try going right to the man page for it
  if (command != "" && command != undefined) {
    // Remove terminal metacharacters from input
    const sanitizedCommand = command
      // eslint-disable-next-line no-useless-escape
      .replaceAll(/[&!;<>*+?\[\]\)\(]/g, "")
      .trim()
      .split(" ")[0];
    return <Results command={sanitizedCommand} />;
  }

  // No direct command argument
  // Show the list of man page entries, filtered by search term
  useEffect(() => setSearchTerm("AA"), []);

  useEffect(() => {
    if (pages.length) {
      setFilteredList(pages.filter((page) => fuzzyMatch(searchTerm, page)));
    }
  }, [searchTerm, pages]);

  // Sort the filtered results and limit number of results to avoid heap overflow
  const listItems = filteredList
    .sort((a, b) => {
      if (a == searchTerm) return -1;
      else if (b == searchTerm) return 1;
      return a > b ? 1 : -1;
    })
    .slice(0, Math.min(filteredList.length, MAX_LIST_RESULTS))
    .map((page, index) => {
      return (
        <List.Item
          title={page}
          key={index}
          id={index.toString()}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Command Actions">
                <Action
                  title="View Man Page"
                  icon={Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                  onAction={() => push(<Results command={page} />)}
                />
                <Action
                  title="Run In Terminal"
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  onAction={async () => await runInTerminal(page)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      );
    });

  if (!pages.length) {
    launchCommand({ name: "reload-man-page-entries", type: LaunchType.Background });
  }

  return (
    <List
      isLoading={!pages.length}
      searchBarPlaceholder={`Search ${pages.length} man pages...`}
      onSearchTextChange={(text) => {
        if (text == "") {
          setSearchTerm("AA");
        } else {
          setSearchTerm(text);
        }
      }}
      selectedItemId={""}
    >
      <List.EmptyView icon={{ source: "no-view.png" }} title="No Results" />
      {listItems}
    </List>
  );
}
