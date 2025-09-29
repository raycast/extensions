import { Action, ActionPanel, Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import type { Snippet, State, ListItem } from "./types";
import { MESSAGES } from "./contants";

interface Preferences {
  port: string;
}

const { port } = getPreferenceValues<Preferences>();
const PORT = parseInt(port, 10) || 4321;

export default function Command() {
  const [state, setState] = useState<State>({ list: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get<Snippet[]>(`http://localhost:${PORT}/snippets`);
        const options = data.reduce((acc: ListItem[], snippet) => {
          snippet.contents.forEach((content) => {
            acc.push({
              id: content.id,
              name: content.label,
              snippetName: snippet.name,
              detail: `${content.label} • ${content.language}`,
              description: `${snippet.folder?.name || "Inbox"}`,
              value: content.value ?? "",
              language: content.language,
            });
          });
          return acc;
        }, []);
        setState({ list: options });
      } catch (err) {
        setState({ error: err instanceof Error ? err : new Error(MESSAGES.ERROR) });
      }
    };

    fetchData();
  }, []);

  if (state.error) {
    showToast(Toast.Style.Failure, MESSAGES.ERROR);
  }

  return (
    <List isShowingDetail searchBarPlaceholder="Type to search snippets">
      {state.list?.map((i) => {
        const markdownDetail =
          `**Fragment:** ${i.name}` +
          `\n\n**Language:** ${i.language}\n` +
          "```" +
          i.language +
          "\n" +
          i.value +
          "\n```";
        return (
          <List.Item
            key={i.id}
            title={i.snippetName}
            icon={Icon.Document}
            accessories={[{ text: i.description }]}
            detail={<List.Item.Detail markdown={markdownDetail} />}
            actions={
              <ActionPanel title="Some">
                <ActionPanel.Section>{<Action.CopyToClipboard content={i.value} />}</ActionPanel.Section>
              </ActionPanel>
            }
          ></List.Item>
        );
      })}
    </List>
  );
}
