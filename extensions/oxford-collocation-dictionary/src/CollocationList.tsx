import { Action, ActionPanel, List } from "@raycast/api";
import { Collocation } from "./parseHtml";
import { capitalizeWord } from "./utils";

type CollocationList = {
  collocationGroup: Collocation;
};
export const CollocationList = ({ collocationGroup }: CollocationList) => {
  return (
    <List>
      {collocationGroup.collocations.map((collocation) => (
        <List.Item
          key={collocation}
          title={capitalizeWord(collocation)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy to Clipboard" content={collocation} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
