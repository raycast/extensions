import { useEffect, useState } from "react";
import { Action, ActionPanel, List, closeMainWindow } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";

interface IWindow {
  id: number;
  title: string;
  app: string;
  "has-focus": boolean;
  "stack-index": number;
}
async function getWindowsList(): Promise<IWindow[]> {
  const windowsList = await runYabaiCommand(`-m query --windows --space`);
  if (windowsList.stdout) {
    return JSON.parse(windowsList.stdout);
  }
  throw new Error(windowsList.stderr);
}
const useWindowsList = () => {
  const [state, setState] = useState<{ list: IWindow[]; isLoading: boolean }>({
    list: [],
    isLoading: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const list = await getWindowsList();
        list.sort((a, b) => a["stack-index"] - b["stack-index"]);
        setState({
          list,
          isLoading: false,
        });
      } catch (error) {
        console.error(error);
        setState({
          list: [],
          isLoading: false,
        });
      }
    })();
  }, []);

  return state;
};

export function selectWindow(id: number) {
  runYabaiCommand(`-m window --focus ${id}`);
  closeMainWindow({ clearRootSearch: true });
}

export default function Command() {
  const { list, isLoading } = useWindowsList();

  let selectedItemId = 0;
  if (list) {
    console.log(list);
    selectedItemId = list.find((f) => f["has-focus"])?.id || 0;
  }

  return (
    <List isLoading={isLoading} selectedItemId={selectedItemId.toString()}>
      {list?.map((item) => (
        <List.Item
          id={item.id.toString()}
          key={item.id}
          icon={{ fileIcon: `/Applications/${item.app}.app` }}
          title={item.title}
          accessories={[{ text: item.app }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Focus window" onAction={() => selectWindow(item.id)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
