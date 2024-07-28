import { ActionPanel, List, Action, showToast, Toast, Clipboard, confirmAlert, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getClipboardItems, getClipboardItem, deleteClipboardItem, saveClipboardItem } from "./clipboardStorage";
import { EditClipboardForm } from "./EditClipboardForm";

export default function Command() {
  const [items, setItems] = useState<Record<string, string>>({});
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchItems() {
      const clipboardItems = await getClipboardItems();
      setItems(clipboardItems);
    }
    fetchItems();
  }, []);

  async function handlePaste(name: string) {
    const content = await getClipboardItem(name);
    if (content) {
      await Clipboard.paste(content);
      showToast(Toast.Style.Success, "Pasted from named clipboard");
    } else {
      showToast(Toast.Style.Failure, "Clipboard item not found");
    }
  }

  async function handleDelete(name: string) {
    if (await confirmAlert({
      title: "Delete Clipboard Item",
      message: `Are you sure you want to delete "${name}"?`,
      primaryAction: {
        title: "Delete",
        style: Action.Style.Destructive as any,
      },
    })) {
      await deleteClipboardItem(name);
      const updatedItems = { ...items };
      delete updatedItems[name];
      setItems(updatedItems);
      showToast(Toast.Style.Success, "Clipboard item deleted");
    }
  }

  async function handleEdit(name: string, newContent: string) {
    await saveClipboardItem(name, newContent);
    const updatedItems = { ...items, [name]: newContent };
    setItems(updatedItems);
    showToast(Toast.Style.Success, "Clipboard item updated");
  }

  const filteredItems = Object.entries(items).filter(([name, content]) =>
    name.toLowerCase().includes(searchText.toLowerCase()) ||
    content.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <List
      searchBarPlaceholder="Search clipboards..."
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {filteredItems.map(([name, content]) => (
        <List.Item
          key={name}
          title={name}
          subtitle={content}
          actions={
            <ActionPanel>
              <Action title="Paste" onAction={() => handlePaste(name)} />
              <Action
                title="Edit"
                onAction={() => {
                  push(<EditClipboardForm name={name} initialContent={content} onEdit={handleEdit} />);
                }}
              />
              <Action title="Delete" onAction={() => handleDelete(name)} style={Action.Style.Destructive} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
