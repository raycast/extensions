import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import type { ClipboardItem } from "../hooks/use-clipboard-history";

type Props = {
  clipboardItems: ClipboardItem[];
  onSelectImage: (filePath: string) => void;
  onSelectText: (text: string) => void;
};

export function ClipboardSelector({ clipboardItems, onSelectImage, onSelectText }: Props) {
  function handleSelect(item: ClipboardItem) {
    if (item.type === "image") {
      onSelectImage(item.content);
      showToast({ title: "Image selected from clipboard", style: Toast.Style.Success });
    } else {
      onSelectText(item.content);
      showToast({ title: "Text pasted from clipboard", style: Toast.Style.Success });
    }
  }

  return (
    <ActionPanel.Submenu
      title="Select from Clipboard"
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
    >
      {clipboardItems.length > 0 ? (
        clipboardItems.map((item, index) => {
          if (item.type === "image") {
            const filename = item.content.split("/").pop() || "Unknown";
            return (
              <Action
                key={item.offset}
                title={`${filename}${index === 0 ? " (Latest)" : ""}`}
                icon={{ source: item.content }}
                onAction={() => handleSelect(item)}
              />
            );
          } else {
            return (
              <Action
                key={item.offset}
                title={`${item.content}${index === 0 ? " (Latest)" : ""}`}
                icon={Icon.Text}
                onAction={() => handleSelect(item)}
              />
            );
          }
        })
      ) : (
        <Action
          title="No Items in Clipboard History"
          icon={Icon.XMarkCircle}
          onAction={() => showToast({ title: "No clipboard items found", style: Toast.Style.Failure })}
        />
      )}
    </ActionPanel.Submenu>
  );
}
