import { Action, ActionPanel, Alert, confirmAlert, Icon, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { runAppleScript } from "run-applescript";

interface ExportArguments {
  query?: string;
}

export default function Main(props: { arguments: ExportArguments }) {
  const { query } = props.arguments;
  const [rows, setRows] = useState<string[]>();

  const updateRows = async () => {
    await runAppleScript(`tell application "Bike"
            set textList to {}
            set theTexts to text content of rows of document 1
            repeat with theText in theTexts
                copy text of theText to the end of textList
                copy "\\n" to the end of textList
            end repeat
            return textList
        end tell`).then((t) => setRows(t.split(", \n, ")));
  };

  // Get list of every row's text content
  useEffect(() => {
    updateRows();
  }, []);

  // Show the list of rows in active document
  const listItems: JSX.Element[] = [];
  rows?.forEach((rowText, index) => {
    if (rowText != "" && rowText.toLowerCase().includes(query?.toLowerCase() || "")) {
      listItems.push(
        <List.Item
          title={rowText.endsWith(", \n") ? rowText.substring(0, rowText.length - 3) : rowText}
          key={index}
          id={index.toString()}
          actions={
            <ActionPanel>
              <Action
                title="Go To Row"
                icon={Icon.ArrowRightCircle}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
                onAction={async () =>
                  await runAppleScript(`tell application "Bike"
                    activate
                    select document 1 at row ${index + 1} of document 1
                end tell`)
                }
              />
              <Action
                title="Copy URL"
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={async () =>
                  await runAppleScript(`tell application "Bike"
                    set theURL to row ${index + 1} of document 1
                    set the clipboard to theURL
                end tell`)
                }
              />
              <Action
                title="Delete Row"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Are you sure?",
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    })
                  ) {
                    await runAppleScript(`tell application "Bike"
                            delete row ${index + 1} of document 1
                        end tell`);
                  }
                  await updateRows();
                }}
              />
            </ActionPanel>
          }
        />
      );
    }
  });

  return (
    <List
      isLoading={rows === undefined}
      searchBarPlaceholder={rows?.length ? `Search ${rows.length} rows...` : `Search rows...`}
    >
      <List.EmptyView icon={{ source: "no-view.png" }} title="No Results" />
      {listItems}
    </List>
  );
}
