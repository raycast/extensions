import { Action, ActionPanel, List, useNavigation, launchCommand, LaunchType, Icon } from "@raycast/api";
import { runInTerminal, useGetManPages } from "./utils";
import { Results } from "./components/Results";

interface ExportArguments {
  command?: string;
}

export default function Main(props: { arguments: ExportArguments }) {
  const { command } = props.arguments;
  const { push } = useNavigation();

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

  launchCommand({ name: "reload-man-page-entries", type: LaunchType.Background });

  return (
    <List searchBarPlaceholder={`Search ${pages.length} man pages...`} filtering={true}>
      <List.EmptyView icon={{ source: "no-view.png" }} title="No Results" />
      {listItems}
    </List>
  );
}
