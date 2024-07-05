import { useEffect, useState } from "react";
import { Action, ActionPanel, List, closeMainWindow } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";

function getWindowsList(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const tt = await runYabaiCommand(`-m query --windows --space`);
    if (tt.stdout) {
      resolve(JSON.parse(tt.stdout));
    }
  });
}

const useWindowsList = () => {
  const [state, setState] = useState<{ list: { id: string; title: string }[]; isLoading: boolean }>({
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

export function selectWindow(id:string){
  runYabaiCommand(`-m window --focus ${id}`);
	closeMainWindow({ clearRootSearch: true });
}

export default function Command() {
  const {list, isLoading} = useWindowsList();

	let  selectedItemId = 0
	if(list){
			selectedItemId = list.find(f=>f['has-focus'])?.id || 0
	}

  return (
    <List isLoading={isLoading} selectedItemId={selectedItemId.toString()}>
		 {list?.map((item) => (
        <List.Item
				id={item.id.toString()}
				key={item.id}
					icon={{fileIcon: `/Applications/${item.app}.app`}}
          title={item.title}
					accessories={[{ text: item.app }]}
					actions={
          <ActionPanel>
						   <ActionPanel.Section>
								 <Action title="Focus window" onAction={() => selectWindow(item.id)} />
							</ActionPanel.Section >
          </ActionPanel>
        }
        />
      ))}
    </List>
  );
}
