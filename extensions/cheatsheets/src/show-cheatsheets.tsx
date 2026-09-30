import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useListFiles } from "./hooks";
import { urlFor } from "./utils";
import { SheetView } from "./components";

export default function Command() {
  const { isLoading, data: sheets } = useListFiles();

  return (
    <List isLoading={isLoading}>
      {sheets.map((sheet) => (
        <List.Item
          actions={
            <ActionPanel>
              <Action.Push title="Open Cheatsheet" icon={Icon.Window} target={<SheetView slug={sheet} />} />
              <Action.OpenInBrowser url={urlFor(sheet)} />
            </ActionPanel>
          }
          key={sheet}
          title={sheet}
        />
      ))}
    </List>
  );
}
