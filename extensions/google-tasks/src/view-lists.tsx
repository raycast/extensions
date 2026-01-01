import { List, Toast, showToast, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import ListView from "./components/ListView";
import { fetchLists } from "./api/endpoints";
import { GoogleAuthProvider } from "./contexts/GoogleAuthProvider";

function ViewListsCommand() {
  const [isLoading, setIsLoading] = useState(true);
  const [lists, setLists] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const fetchedLists = await fetchLists();
        setLists(fetchedLists);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, []);

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

export default function Command() {
  return (
    <GoogleAuthProvider>
      <ViewListsCommand />
    </GoogleAuthProvider>
  );
}
