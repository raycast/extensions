import { List, Detail, Toast, showToast, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import ListView from "./components/ListView";
import * as google from "./api/oauth";
import { fetchLists } from "./api/endpoints";

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lists, setLists] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        await google.authorize();
        const fetchedLists = await fetchLists();
        setLists(fetchedLists);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, [google]);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <List isLoading={isLoading}>
      {lists.map((list) => {
        return (
          <List.Item
            key={list.id}
            id={list.id}
            title={list.title}
            actions={
              <ActionPanel>
                <Action.Push title="Show List" icon={Icon.List} target={<ListView listId={list.id} />} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
