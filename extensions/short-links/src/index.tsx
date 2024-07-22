import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  launchCommand,
  LaunchType,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

interface Item {
  id: string;
  title: string;
}

export default function Command() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    async function fetchItems() {
      const storedItems = await LocalStorage.allItems();

      if (storedItems) {
        const keyValueItems = Object.entries(storedItems).map(([id, title]) => ({ id, title }));
        setItems(keyValueItems);
      }
    }
    fetchItems();
  }, []);

  const copyToClipboard = async (content: string) => {
    await Clipboard.copy(content);
    await showToast(Toast.Style.Success, "Copied to clipboard");
  };

  const redirectToAdd = async () => {
    await launchCommand({ name: "add-shortlink", type: LaunchType.UserInitiated, context: {} });
  };

  return (
    <List isLoading={items?.length === 0}>
      {items !== null &&
        items?.length > 0 &&
        items?.map((item) => (
          <List.Item
            key={item.id}
            title={`/${item.id}`}
            subtitle={item.title}
            actions={
              <ActionPanel>
                <Action.Paste content={item.title} />
                <Action title="Copy" onAction={() => copyToClipboard(item.title)} icon={Icon.Clipboard} />
                <Action title="Add" onAction={() => redirectToAdd()} icon={Icon.Plus} />
                <Action
                  title="Edit"
                  onAction={() =>
                    launchCommand({
                      name: "edit-shortlink",
                      type: LaunchType.UserInitiated,
                      arguments: { id: item.id, title: item.title },
                    })
                  }
                  icon={Icon.Pencil}
                />
                <Action
                  title="Delete"
                  onAction={async () => {
                    await LocalStorage.removeItem(item.id);
                    setItems((prevItems) => prevItems.filter((i) => i.id !== item.id));
                  }}
                  icon={Icon.Trash}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
