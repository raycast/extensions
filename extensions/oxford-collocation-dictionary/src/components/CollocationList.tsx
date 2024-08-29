import { Action, ActionPanel, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { capitalizeWord } from "../lib/utils";

type CollocationList = {
  collocations: string[];
};
export const CollocationList = ({ collocations }: CollocationList) => {
  const [items, setItems] = useState<string[]>();

  useEffect(() => {
    const id = setTimeout(() => {
      setItems(collocations);
    }, 500);

    return () => {
      clearTimeout(id);
    };
  }, []);

  return (
    <List isLoading={items === undefined}>
      {collocations.map((collocation) => (
        <List.Item
          key={collocation}
          title={capitalizeWord(collocation)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy to Clipboard" content={collocation} />
              <Action.Paste content={collocation} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
