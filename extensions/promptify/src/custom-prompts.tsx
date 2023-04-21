import { Action, ActionPanel, Alert, Icon, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { clearStorage, fetchStorage } from "./utils";
import { CustomPrompts } from "./types";
import { useEffect, useState } from "react";
import CreatePrompt from "./create-prompt";

export default function CustomPromptsView() {
  const [items, setItems] = useState<CustomPrompts>({});
  const { push } = useNavigation();
  useEffect(() => {
    fetchStorage(true)
      .then((res) => {
        setItems(res);
      })
      .catch((err) => {
        console.log(err);
        showToast(Toast.Style.Failure, "Couldn't fetch storage");
      });
  }, []);

  return (
    <List>
      {Object.values(items)
        ?.reverse()
        ?.map((item, index: number) => {
          return (
            <List.Item
              title={item?.name}
              subtitle={`${item?.prompt?.slice(0, 35)}${
                item?.prompt?.length && item?.prompt?.length > 35 ? "..." : ""
              }`}
              key={`stored-prompt-${index}`}
              actions={
                <ActionPanel>
                  <Action
                    title="Edit prompt"
                    icon={Icon.Pencil}
                    onAction={() => {
                      push(
                        <CreatePrompt
                          values={{ name: item?.name, role: "system", prompt: item?.prompt }}
                          state={items}
                          setState={setItems}
                        />
                      );
                    }}
                  />
                  <Action
                    title="Create prompt"
                    icon={Icon.PlusCircle}
                    onAction={() => {
                      push(<CreatePrompt />);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    style={Action.Style.Destructive}
                    title="Delete prompt"
                    icon={Icon.Trash}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Are you sure?",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        clearStorage(item?.name);
                        const newItems = { ...items };
                        delete newItems[item?.name];
                        setItems(newItems);
                      }
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel>
              }
              accessories={[{ icon: Icon.XMarkCircle }]}
            />
          );
        })}
    </List>
  );
}
