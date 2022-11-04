import React, { useEffect, useState } from "react";
import * as miro from "./oauth/miro";
import { Board } from "@mirohq/miro-api";
import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";

export default function ListBoards() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<Board[]>([]);

  useEffect(() => {
    (async () => {
      try {
        await miro.authorize();
        const fetchedItems = await miro.fetchItems();
        setItems(fetchedItems);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        await showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, []);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <List isLoading={isLoading}>
      {items.map((item) => {
        return (
          <List.Item
            key={item.id}
            id={item.id}
            icon={Icon.Document}
            title={item.name}
            subtitle={item.description}
            actions={
              <ActionPanel>
                {item.viewLink && (
                  <>
                    <Action.OpenInBrowser url={item.viewLink} />
                    <Action.CopyToClipboard title="Copy URL" content={item.viewLink} />
                  </>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
