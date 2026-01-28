import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showHUD } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  copyEntireRowContents,
  copyRowText,
  copyRowURL,
  deleteRowFromDocument,
  getIndentedRows,
  goToRowInDocument,
} from "./scripts";

interface ExportArguments {
  query?: string;
}

export default function Main(props: { arguments: ExportArguments }) {
  const { query } = props.arguments;
  const [rows, setRows] = useState<string[]>();

  const updateRows = async () => {
    await getIndentedRows(1).then((t) => setRows(t.split(", \n, ")));
  };

  // Get list of every row's text content
  useEffect(() => {
    updateRows();
  }, []);

  // Show the list of rows in active document
  const listItems: JSX.Element[] = [];
  rows?.forEach((rowText, index) => {
    if (
      rowText != "" &&
      (rowText.toLowerCase().includes(query?.toLowerCase() || "") || (index + 1).toString().includes(query || ""))
    ) {
      listItems.push(
        <List.Item
          title={rowText.endsWith(", \n") ? rowText.substring(0, rowText.length - 3) : rowText}
          subtitle={`Row ${index + 1}`}
          keywords={[(index + 1).toString()]}
          key={index}
          id={index.toString()}
          actions={
            <ActionPanel>
              <Action
                title="Go To Row"
                icon={Icon.ArrowRightCircle}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
                onAction={async () => await goToRowInDocument(index + 1, 1)}
              />
              <Action
                title="Copy Row URL"
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={async () => {
                  await copyRowURL(index + 1, 1);
                  await showHUD("Copied Row URL To Clipboard");
                }}
              />
              <Action
                title="Copy Row Text"
                icon={Icon.Text}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={async () => {
                  await copyRowText(index + 1, 1);
                  await showHUD("Copied Row Text To Clipboard");
                }}
              />
              <Action
                title="Copy Row's Entire Contents"
                icon={Icon.Snippets}
                shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                onAction={async () => {
                  await copyEntireRowContents(index + 1, 1);
                  await showHUD("Copied Row's Entire Contents To Clipboard");
                }}
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
                    await deleteRowFromDocument(index + 1, 1);
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
