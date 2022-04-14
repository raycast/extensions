import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

interface SnippetContent {
  label: string;
  language: string;
  value: string;
}

interface Snippet {
  id: string;
  name: string;
  content: SnippetContent[];
  folderId: string;
  tagsIds: string[];
  isFavorites: boolean;
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
}

interface State {
  snippets?: Snippet[];
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({ snippets: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get<Snippet[]>("http://localhost:3033/snippets");
        setState({ snippets: res.data });
      } catch (err) {
        setState({ error: err instanceof Error ? err : new Error("Something went wrong") });
      }
    };

    fetchData();
  }, []);

  if (state.error) {
    showToast(Toast.Style.Failure, "massCode app is not running");
  }

  return (
    <List searchBarPlaceholder="Type to search snippets">
      {state.snippets?.map((i) => {
        return (
          <List.Item
            key={i.id}
            title={i.name}
            subtitle={i.content[0].language}
            icon={Icon.Document}
            accessories={[{ text: "Folder" }]}
            actions={
              <ActionPanel title="Some">
                <ActionPanel.Section>{<Action.CopyToClipboard content={i.content[0].value} />}</ActionPanel.Section>
              </ActionPanel>
            }
          ></List.Item>
        );
      })}
    </List>
  );
}
