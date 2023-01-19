import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import { useGetManPages } from "./utils";
import { Results } from "./components/Results";

interface ExportArguments {
  command: string;
}

export default function Main(props: { arguments: ExportArguments }) {
  const { command } = props.arguments;
  const { push } = useNavigation();

  const pages = useGetManPages();

  // User provided a command -- try going right to the man page for it
  if (command != "") {
    // Remove terminal metacharacters from input
    const sanitizedCommand = command
      // eslint-disable-next-line no-useless-escape
      .replaceAll(/[&!;<>*+?\[\]\)\(]/g, "")
      .trim()
      .split(" ")[0];
    return <Results command={sanitizedCommand} />;
  }

  // No direct command argument
  // Display loading list while waiting for data
  if (!pages?.length) {
    return <List isLoading={true} searchBarPlaceholder={`Search ${pages.length} man pages...`} />;
  }

  // Show the list of all man page entries
  const listItems = pages.map((page, index) => {
    return (
      <List.Item
        title={page}
        key={index}
        id={index.toString()}
        actions={
          <ActionPanel>
            <Action title={page} onAction={() => push(<Results command={page} />)} />
          </ActionPanel>
        }
      />
    );
  });

  return (
    <List searchBarPlaceholder={`Search ${pages.length} man pages...`} enableFiltering={true}>
      <List.EmptyView icon={{ source: "no-view.png" }} title="No Results" />
      {listItems}
    </List>
  );
}
